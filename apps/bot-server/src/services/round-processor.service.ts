import type { Dayjs } from 'dayjs';
import type { Telegraf } from 'telegraf';
import { DEFAULT_STARTING_VALUE_CM, MAX_ANNOUNCED_CATCHUP_ROUNDS } from '../config/constants';
import { SeasonModel, type SeasonChatTop, type SeasonTopEntry } from '../database/models/season.model';
import { UserModel, type UserHydratedDocument, type UserTitleCode } from '../database/models/user.model';
import { formatUnlocks } from '../achievements/achievement-announce';
import { safeBump } from '../achievements/achievement-progress.service';
import { getAchievementSettings } from '../achievements/achievement-settings.service';
import { safeSync } from '../achievements/achievement.service';
import { nowUtc } from '../utils/date.util';
import { progress } from '../utils/mode.util';
import { formatCm, formatCmSigned, roundCm } from '../utils/number.util';
import {
  getCurrentRoundNumber,
  getSeasonBounds,
  getSeasonNumber,
  isLastRoundOfSeason,
} from '../utils/season-round.util';
import { userLabel } from '../utils/user-label.util';
import { getOrCreateGameState } from './game-state.service';
import { getAllChatIds, getActiveUsers, initializeRound } from './round-lifecycle.service';
import { collectRoundStandings } from './round-standings.service';

const SEASON_TOP_SIZE = 10;

async function sendMessageSafely(bot: Telegraf, chatId: number, text: string, announce: boolean): Promise<void> {
  if (!announce) {
    return;
  }
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

/**
 * Одноразове обнулення value/кулдауну на старт першого раунду (див. п.1
 * плану) - "чистий старт" для змагальної системи сезонів/раундів. Захищене
 * прапорцем у GameState, тож навіть при повторних викликах спрацює лише
 * один раз.
 */
async function performSeasonStartReset(): Promise<void> {
  await UserModel.updateMany(
    {},
    {
      $set: {
        value: DEFAULT_STARTING_VALUE_CM,
        last_measurement_at: null,
        season_growth: 0,
        round_growth: 0,
        round_best_delta: null,
        round_measurement_count: 0,
      },
    },
  );
  console.log('[roundProcessor] one-time season-start reset applied to all users');
}

async function announceRoundSummary(
  bot: Telegraf,
  users: UserHydratedDocument[],
  endedRoundNumber: number,
  announce: boolean,
): Promise<void> {
  for (const chatId of getAllChatIds(users)) {
    const members = users.filter((u) => u.chats.includes(chatId));
    if (members.length === 0) continue;

    const mvp = [...members].sort(
      (a, b) => progress(b.round_growth, b.mode) - progress(a.round_growth, a.mode),
    )[0];
    const unlucky = [...members].sort(
      (a, b) => progress(a.round_growth, a.mode) - progress(b.round_growth, b.mode),
    )[0];
    const biggestJump = [...members]
      .filter((m) => m.round_best_delta !== null)
      .sort((a, b) => (b.round_best_delta ?? 0) - (a.round_best_delta ?? 0))[0];

    const lines = [`📊 Підсумки раунду ${endedRoundNumber}:`];
    if (mvp && progress(mvp.round_growth, mvp.mode) > 0) {
      lines.push(`🏆 MVP тижня: ${userLabel(mvp)} (${formatCmSigned(mvp.round_growth)} см за тиждень)`);
    }
    if (biggestJump && (biggestJump.round_best_delta ?? 0) > 0) {
      // round_best_delta - вже прогрес (див. 3.3), тому підпис завжди зі знаком "+".
      const jump = biggestJump.round_best_delta as number;
      lines.push(`⚡ Найбільший стрибок: ${userLabel(biggestJump)} (+${formatCm(jump)} см за один вимір)`);
    }
    if (unlucky && progress(unlucky.round_growth, unlucky.mode) < 0 && unlucky !== mvp) {
      lines.push(`💀 Невдаха тижня: ${userLabel(unlucky)} (${formatCm(unlucky.round_growth)} см за тиждень)`);
    }

    if (lines.length > 1) {
      await sendMessageSafely(bot, chatId, lines.join('\n'), announce);
    }
  }
}

/**
 * Замінює колишні "квести тижня" (announceWeeklyQuests): рахує лічильники
 * holder/climber і оголошує розблоковані рівні досягнень у ВСІХ чатах
 * гравця (а не лише в тому, де сталась подія - на відміну від /metr і дуелі).
 */
async function announceAchievementUnlocks(
  bot: Telegraf,
  users: UserHydratedDocument[],
  endedRoundNumber: number,
  announce: boolean,
): Promise<void> {
  const standings = await collectRoundStandings(users, getAllChatIds(users), endedRoundNumber);

  const seenTop3 = new Set<number>();
  for (const ids of standings.top3ByChat.values()) {
    for (const id of ids) {
      // Гравець у топ-3 одразу двох чатів отримує +1, а не +2: досягнення про
      // «тримати топ раунд за раундом», а не про кількість чатів (для цього є `traveler`).
      if (!seenTop3.has(id)) {
        seenTop3.add(id);
        await safeBump(id, { inc: { 'counters.top3_round_finishes': 1 } });
      }
    }
  }
  for (const { telegramId } of standings.climbers) {
    await safeBump(telegramId, { inc: { 'counters.climber_entries': 1 } });
  }

  const settings = await getAchievementSettings();
  const byChat = new Map<number, string[]>();

  for (const user of users) {
    const unlocks = await safeSync(user.telegram_id);
    if (unlocks.length === 0 || !settings.announce_enabled) continue;
    const text = formatUnlocks(userLabel(user), unlocks);
    for (const chatId of user.chats) {
      const texts = byChat.get(chatId) ?? [];
      texts.push(text);
      byChat.set(chatId, texts);
    }
  }

  for (const [chatId, texts] of byChat) {
    await sendMessageSafely(bot, chatId, texts.join('\n\n'), announce);
  }
}

function rankAndAward(members: UserHydratedDocument[]): SeasonTopEntry[] {
  return [...members]
    .sort((a, b) => progress(b.season_growth, b.mode) - progress(a.season_growth, a.mode))
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

async function announceSeasonSummary(
  bot: Telegraf,
  users: UserHydratedDocument[],
  endedSeasonNumber: number,
  announce: boolean,
): Promise<void> {
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
        `🏆 Сезон ${endedSeasonNumber} завершено!\nЧемпіон цього чату: ${userLabel(top[0])} (+${formatCm(top[0].growth)} см за сезон)\nГлобальний чемпіон: ${
          topGlobal[0] ? `${userLabel(topGlobal[0])} (+${formatCm(topGlobal[0].growth)} см)` : '—'
        }`,
        announce,
      );
    }
  }

  const { startsAt, endsAt } = getSeasonBounds(endedSeasonNumber);
  await SeasonModel.updateOne(
    { season_number: endedSeasonNumber },
    { season_number: endedSeasonNumber, started_at: startsAt, ended_at: endsAt, top_global: topGlobal, top_by_chat: topByChat },
    { upsert: true },
  );

  // Фіксуємо ДО обнулення season_growth нижче - інакше season_rush відкриється
  // лише через тиждень. announceAchievementUnlocks (де і рахуємось rewards/
  // анонси) викликається вже ПІСЛЯ цього блоку в processRoundTransitions.
  for (const u of users) {
    await safeBump(u.telegram_id, {
      max: { 'counters.best_season_growth': roundCm(progress(u.season_growth, u.mode)) },
    });
  }

  await UserModel.updateMany({}, { $set: { season_growth: 0 } });
}

async function resetRoundCounters(): Promise<void> {
  await UserModel.updateMany(
    {},
    { $set: { round_growth: 0, round_best_delta: null, round_measurement_count: 0 } },
  );
}

/**
 * Викликається крон-джобою (див. bot/scheduler.ts). Ідемпотентно: якщо
 * нічого не змінилось із минулого виклику - просто нічого не робить.
 */
export async function processRoundTransitions(bot: Telegraf, at: Dayjs = nowUtc()): Promise<void> {
  const currentRoundNumber = getCurrentRoundNumber(at);
  if (currentRoundNumber <= 0) {
    return;
  }

  const gameState = await getOrCreateGameState();

  if (!gameState.season_start_reset_done) {
    await performSeasonStartReset();
    gameState.season_start_reset_done = true;
    await gameState.save();
  }

  // Холодний старт (порожня БД або довгий простій до першого запуску): не
  // відтворюємо "прожиту" історію раундів заднім числом, а вважаємо систему
  // щойно запущеною з поточного раунду. Узагальнення фікса з d1b654c (крон
  // повторно ре-ініціалізував раунд 1) - тепер працює для старту на будь-якому
  // номері раунду, а не лише на першому.
  if (gameState.last_processed_round_number === 0) {
    gameState.last_processed_round_number = Math.max(0, currentRoundNumber - 1);
    await gameState.save();
    await initializeRound(currentRoundNumber, gameState, bot);
    return;
  }

  while (gameState.last_processed_round_number < currentRoundNumber - 1) {
    const endedRoundNumber = gameState.last_processed_round_number + 1;
    const newRoundNumber = endedRoundNumber + 1;
    // Скільки раундів (включно з цим) ще лишилось доганяти - анонсуємо лише
    // останні MAX_ANNOUNCED_CATCHUP_ROUNDS з них, старіші доганяємо мовчки
    // (без bot.telegram.sendMessage), щоб довгий простій не засипав чати
    // підсумками неіснуючих для гравців раундів.
    const remainingRounds = currentRoundNumber - 1 - gameState.last_processed_round_number;
    const announce = remainingRounds <= MAX_ANNOUNCED_CATCHUP_ROUNDS;
    const users = await getActiveUsers();

    await announceRoundSummary(bot, users, endedRoundNumber, announce);

    // ПЕРЕД announceAchievementUnlocks - зафіксувати best_season_growth
    // (announceSeasonSummary) до того, як його побачить syncAchievements,
    // інакше season_rush відкриється лише за тиждень (наступний раунд).
    if (isLastRoundOfSeason(endedRoundNumber)) {
      await announceSeasonSummary(bot, users, getSeasonNumber(endedRoundNumber), announce);
    }

    // Лічильники досягнень рахуються тут, до resetRoundCounters() нижче -
    // round_growth від них буде скинутий за мить, і це нормально (підсумок
    // стосується вже завершеного раунду), а season_growth лишається, бо
    // resetRoundCounters() його не чіпає.
    await announceAchievementUnlocks(bot, users, endedRoundNumber, announce);

    await resetRoundCounters();

    gameState.last_processed_round_number = endedRoundNumber;
    await gameState.save();

    await initializeRound(newRoundNumber, gameState, bot);
  }
}
