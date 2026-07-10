import type { Dayjs } from 'dayjs';
import type { Telegraf } from 'telegraf';
import { ROUND_THEMES, type RoundTheme } from '../data/roundThemes.data';
import type { GameStateHydratedDocument } from '../database/models/gameState.model';
import { UserModel, type UserHydratedDocument } from '../database/models/user.model';
import { nowUtc } from '../utils/date.util';
import { getCurrentRoundNumber } from '../utils/seasonRound.util';
import { getOrCreateGameState } from './gameState.service';
import { assignDuelQuestsForRound } from './quest.service';
import { takeTop3Snapshots } from './weeklyGoals.service';

function pickRandomTheme(): RoundTheme {
  return ROUND_THEMES[Math.floor(Math.random() * ROUND_THEMES.length)];
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
 * Усе, що відбувається на СТАРТ раунду: вибір теми (чистий авторандом),
 * знімок топ-3 за чатами (для climber-квесту), роздача індивідуальних
 * квестів. Ідемпотентно - якщо gameState.current_theme_round_number вже
 * дорівнює roundNumber, нічого не робить (крон і лінивий виклик із команд
 * можуть перетнутись у часі).
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

  const theme = pickRandomTheme();
  gameState.current_theme_code = theme.code;
  gameState.current_theme_round_number = roundNumber;
  await gameState.save();

  await takeTop3Snapshots(roundNumber, users, chatIds);
  await assignDuelQuestsForRound(roundNumber, users);

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
