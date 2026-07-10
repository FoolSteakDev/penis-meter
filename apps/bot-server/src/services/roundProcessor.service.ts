import type { Dayjs } from 'dayjs';
import type { Telegraf } from 'telegraf';
import { SeasonModel, type SeasonChatTop, type SeasonTopEntry } from '../database/models/season.model';
import { UserModel, type UserHydratedDocument, type UserTitleCode } from '../database/models/user.model';
import { nowUtc } from '../utils/date.util';
import {
  getCurrentRoundNumber,
  getSeasonBounds,
  getSeasonNumber,
  isLastRoundOfSeason,
} from '../utils/seasonRound.util';
import { ensureRoundInitialized, getActiveTheme, getOrCreateGameState } from './gameState.service';

const SEASON_TOP_SIZE = 10;

function userLabel(u: { username: string | null; first_name: string }): string {
  return u.username ?? u.first_name;
}

async function sendMessageSafely(bot: Telegraf, chatId: number, text: string): Promise<void> {
  try {
    await bot.telegram.sendMessage(chatId, text);
  } catch (error) {
    console.error(`[roundProcessor] failed to send message to chat ${chatId}`, error);
  }
}

function titleCodeForRank(rank: number): UserTitleCode | null {
  if (rank === 1) return 'champion';
  if (rank === 2) return 'silver';
  if (rank === 3) return 'bronze';
  if (rank <= SEASON_TOP_SIZE) return 'top10';
  return null;
}

async function getActiveUsers(): Promise<UserHydratedDocument[]> {
  return UserModel.find({ 'chats.0': { $exists: true } });
}

function getAllChatIds(users: UserHydratedDocument[]): number[] {
  const chatIds = new Set<number>();
  for (const user of users) {
    for (const chatId of user.chats) {
      chatIds.add(chatId);
    }
  }
  return [...chatIds];
}

async function announceRoundSummary(bot: Telegraf, users: UserHydratedDocument[], endedRoundNumber: number): Promise<void> {
  for (const chatId of getAllChatIds(users)) {
    const members = users.filter((u) => u.chats.includes(chatId));
    if (members.length === 0) continue;

    const mvp = [...members].sort((a, b) => b.round_growth - a.round_growth)[0];
    const unlucky = [...members].sort((a, b) => a.round_growth - b.round_growth)[0];
    const biggestJump = [...members]
      .filter((m) => m.round_best_delta !== null)
      .sort((a, b) => (b.round_best_delta ?? 0) - (a.round_best_delta ?? 0))[0];

    const lines = [`📊 Підсумки раунду ${endedRoundNumber}:`];
    if (mvp && mvp.round_growth > 0) {
      lines.push(`🏆 MVP тижня: ${userLabel(mvp)} (+${mvp.round_growth} см за тиждень)`);
    }
    if (biggestJump && (biggestJump.round_best_delta ?? 0) > 0) {
      const jump = biggestJump.round_best_delta as number;
      lines.push(`⚡ Найбільший стрибок: ${userLabel(biggestJump)} (+${jump} см за один вимір)`);
    }
    if (unlucky && unlucky.round_growth < 0 && unlucky !== mvp) {
      lines.push(`💀 Невдаха тижня: ${userLabel(unlucky)} (${unlucky.round_growth} см за тиждень)`);
    }

    if (lines.length > 1) {
      await sendMessageSafely(bot, chatId, lines.join('\n'));
    }
  }
}

function rankAndAward(members: UserHydratedDocument[]): SeasonTopEntry[] {
  return [...members]
    .sort((a, b) => b.season_growth - a.season_growth)
    .slice(0, SEASON_TOP_SIZE)
    .map((u, index) => ({
      telegram_id: u.telegram_id,
      username: u.username,
      first_name: u.first_name,
      growth: u.season_growth,
      rank: index + 1,
    }));
}

async function awardTitles(entries: SeasonTopEntry[], seasonNumber: number, scope: 'global' | 'chat', chatId: number | null): Promise<void> {
  const awardedAt = nowUtc().toDate();
  for (const entry of entries) {
    const titleCode = titleCodeForRank(entry.rank);
    if (!titleCode) continue;
    await UserModel.updateOne(
      { telegram_id: entry.telegram_id },
      {
        $push: {
          titles: {
            season_number: seasonNumber,
            rank: entry.rank,
            title_code: titleCode,
            scope,
            chat_id: chatId,
            awarded_at: awardedAt,
          },
        },
      },
    );
  }
}

async function announceSeasonSummary(bot: Telegraf, users: UserHydratedDocument[], endedSeasonNumber: number): Promise<void> {
  const topGlobal = rankAndAward(users);
  await awardTitles(topGlobal, endedSeasonNumber, 'global', null);

  // Глобальний чемпіон - персональне DM не шлемо (не всі мали приватний чат
  // з ботом), оголошуємо його разом із чат-топом нижче.
  const topByChat: SeasonChatTop[] = [];
  for (const chatId of getAllChatIds(users)) {
    const members = users.filter((u) => u.chats.includes(chatId));
    const top = rankAndAward(members);
    topByChat.push({ chat_id: chatId, top });
    await awardTitles(top, endedSeasonNumber, 'chat', chatId);

    if (top[0]) {
      await sendMessageSafely(
        bot,
        chatId,
        `🏆 Сезон ${endedSeasonNumber} завершено!\nЧемпіон цього чату: ${userLabel(top[0])} (+${top[0].growth} см за сезон)\nГлобальний чемпіон: ${
          topGlobal[0] ? `${userLabel(topGlobal[0])} (+${topGlobal[0].growth} см)` : '—'
        }`,
      );
    }
  }

  const { startsAt, endsAt } = getSeasonBounds(endedSeasonNumber);
  await SeasonModel.updateOne(
    { season_number: endedSeasonNumber },
    { season_number: endedSeasonNumber, started_at: startsAt, ended_at: endsAt, top_global: topGlobal, top_by_chat: topByChat },
    { upsert: true },
  );

  await UserModel.updateMany({}, { $set: { season_growth: 0 } });
}

async function resetRoundCounters(): Promise<void> {
  await UserModel.updateMany({}, { $set: { round_growth: 0, round_best_delta: null } });
}

async function announceNewTheme(bot: Telegraf, users: UserHydratedDocument[], themeName: string, themeDescription: string): Promise<void> {
  const text = `🎭 Нова тема тижня: ${themeName}\n${themeDescription}`;
  for (const chatId of getAllChatIds(users)) {
    await sendMessageSafely(bot, chatId, text);
  }
}

/**
 * Викликається крон-джобою (див. index.ts). Ідемпотентно: якщо нічого не
 * змінилось із минулого виклику - просто нічого не робить.
 */
export async function processRoundTransitions(bot: Telegraf, at: Dayjs = nowUtc()): Promise<void> {
  const currentRoundNumber = getCurrentRoundNumber(at);
  if (currentRoundNumber <= 0) {
    return;
  }

  const gameState = await getOrCreateGameState();

  while (gameState.last_processed_round_number < currentRoundNumber - 1) {
    const endedRoundNumber = gameState.last_processed_round_number + 1;
    const users = await getActiveUsers();

    await announceRoundSummary(bot, users, endedRoundNumber);

    if (isLastRoundOfSeason(endedRoundNumber)) {
      await announceSeasonSummary(bot, users, getSeasonNumber(endedRoundNumber));
    }

    await resetRoundCounters();

    gameState.last_processed_round_number = endedRoundNumber;
    await gameState.save();
  }

  const previousThemeRound = gameState.current_theme_round_number;
  const refreshedState = await ensureRoundInitialized(at);
  if (refreshedState.current_theme_round_number !== previousThemeRound) {
    const theme = getActiveTheme(refreshedState);
    if (theme) {
      const users = await getActiveUsers();
      await announceNewTheme(bot, users, theme.name, theme.description);
    }
  }
}
