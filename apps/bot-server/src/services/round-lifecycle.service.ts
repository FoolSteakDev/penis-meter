import type { Dayjs } from 'dayjs';
import type { Telegraf } from 'telegraf';
import { ROUND_THEMES, type RoundTheme } from '../data/round-themes.data';
import type { GameStateHydratedDocument } from '../database/models/game-state.model';
import { RoundModel } from '../database/models/round.model';
import { UserModel, type UserHydratedDocument } from '../database/models/user.model';
import { nowUtc } from '../utils/date.util';
import { getCurrentRoundNumber, getRoundBounds, getSeasonNumber } from '../utils/season-round.util';
import { getOrCreateGameState } from './game-state.service';
import { takeTop3Snapshots } from './round-standings.service';

function pickRandomTheme(): RoundTheme {
  return ROUND_THEMES[Math.floor(Math.random() * ROUND_THEMES.length)];
}

/**
 * Визначає тему раунду: адмін-керовану з round.model.ts, якщо адмін заздалегідь
 * заповнив condition_code, інакше фолбек на старий випадковий пул (і в цьому
 * випадку upsert-ить Round-документ як запис "що сталось", theme_source:
 * 'random_fallback', щоб адмінка показувала повну історію раундів).
 */
async function resolveRoundTheme(roundNumber: number): Promise<{
  code: string | null;
  name: string;
  description: string;
  conditionCode: string | null;
  conditionChance: number | null;
}> {
  const roundDoc = await RoundModel.findOne({ round_number: roundNumber });

  if (roundDoc?.condition_code) {
    if (roundDoc.theme_source !== 'admin') {
      roundDoc.theme_source = 'admin';
      await roundDoc.save();
    }
    return {
      code: null,
      name: roundDoc.theme_name ?? '',
      description: roundDoc.theme_description ?? '',
      conditionCode: roundDoc.condition_code,
      conditionChance: roundDoc.condition_chance,
    };
  }

  const legacyTheme = pickRandomTheme();
  const { startsAt, endsAt } = getRoundBounds(roundNumber);
  await RoundModel.updateOne(
    { round_number: roundNumber },
    {
      round_number: roundNumber,
      season_number: getSeasonNumber(roundNumber),
      starts_at: startsAt,
      ends_at: endsAt,
      theme_name: legacyTheme.name,
      theme_description: legacyTheme.description,
      theme_source: 'random_fallback',
    },
    { upsert: true },
  );

  return {
    code: legacyTheme.code,
    name: legacyTheme.name,
    description: legacyTheme.description,
    conditionCode: null,
    conditionChance: null,
  };
}

export async function getActiveUsers(): Promise<UserHydratedDocument[]> {
  return UserModel.find({ 'chats.0': { $exists: true } });
}

export function getAllChatIds(users: UserHydratedDocument[]): number[] {
  const chatIds = new Set<number>();
  for (const user of users) {
    for (const chatId of user.chats) {
      chatIds.add(chatId);
    }
  }
  return [...chatIds];
}

async function announceSafely(bot: Telegraf, chatId: number, text: string): Promise<void> {
  try {
    await bot.telegram.sendMessage(chatId, text);
  } catch (error) {
    console.error(`[roundLifecycle] failed to send message to chat ${chatId}`, error);
  }
}

/**
 * Усе, що відбувається на СТАРТ раунду: вибір теми (адмін-керована, з фолбеком
 * на випадковий пул - див. resolveRoundTheme), знімок топ-3 за чатами (для
 * climber-квесту), роздача індивідуальних квестів. Ідемпотентно - якщо
 * gameState.current_theme_round_number вже дорівнює roundNumber, нічого не
 * робить (крон і лінивий виклик із команд можуть перетнутись у часі).
 */
export async function initializeRound(
  roundNumber: number,
  gameState: GameStateHydratedDocument,
  bot?: Telegraf,
): Promise<void> {
  if (gameState.current_theme_round_number === roundNumber) {
    return;
  }

  const users = await getActiveUsers();
  const chatIds = getAllChatIds(users);

  const theme = await resolveRoundTheme(roundNumber);
  gameState.current_theme_code = theme.code;
  gameState.current_theme_round_number = roundNumber;
  gameState.current_theme_name = theme.conditionCode ? theme.name : null;
  gameState.current_theme_description = theme.conditionCode ? theme.description : null;
  gameState.current_theme_condition_code = theme.conditionCode;
  gameState.current_theme_condition_chance = theme.conditionChance;
  await gameState.save();

  await takeTop3Snapshots(roundNumber, users, chatIds);

  if (bot) {
    const text = `🎭 Нова тема тижня: ${theme.name}\n${theme.description}`;
    for (const chatId of chatIds) {
      await announceSafely(bot, chatId, text);
    }
  }
}

/** Лінива ідемпотентна гарантія для викликів поза крон-джобою (команди, вимір). */
export async function ensureRoundInitialized(at: Dayjs = nowUtc()): Promise<GameStateHydratedDocument> {
  const roundNumber = getCurrentRoundNumber(at);
  const gameState = await getOrCreateGameState();
  if (roundNumber > 0) {
    await initializeRound(roundNumber, gameState);
  }
  return gameState;
}
