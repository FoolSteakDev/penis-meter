import { DUEL_CHALLENGE_TTL_MINUTES, DUEL_HISTORY_LIMIT } from '../config/constants';
import { DuelChallengeModel, type DuelChallengeHydratedDocument } from '../database/models/duel-challenge.model';
import { DuelHistoryModel, type DuelHistoryHydratedDocument } from '../database/models/duel-history.model';
import { DuelSettingsModel, type DuelSettingsHydratedDocument } from '../database/models/duel-settings.model';
import { UserModel, type UserHydratedDocument } from '../database/models/user.model';
import { registerDuelWin } from './quest.service';
import { roundCm } from '../utils/number.util';
import { getCurrentRoundNumber } from '../utils/season-round.util';

export interface DuelResolution {
  winnerTelegramId: number;
  loserTelegramId: number;
  amount: number;
  questReward: number | null;
}

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/** Скільки часу документ виклику живе ПІСЛЯ expires_at, перш ніж cleanup_at TTL-індекс його прибере - щоб історія лишалась для дебагу. */
const CLEANUP_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Дуель зачіпає обох учасників напряму (не через їхній власний /metr), тому
 * value/round_growth/season_growth/round_best_delta потрібно оновити тут
 * вручну для КОЖНОГО з двох - інакше підсумки раунду/сезону не побачать
 * цього приросту чи втрати. Атомарний $inc/$max замість read-modify-save -
 * учасник дуелі міг у ту ж мить зробити свій /metr, і save() перезаписав би
 * весь документ поверх нього.
 */
async function applyDuelDelta(user: UserHydratedDocument, delta: number): Promise<void> {
  await UserModel.findOneAndUpdate(
    { _id: user._id },
    {
      $inc: { value: delta, round_growth: delta, season_growth: delta },
      $max: { round_best_delta: delta },
    },
  );
}

export async function getDuelSettings(): Promise<DuelSettingsHydratedDocument> {
  const existing = await DuelSettingsModel.findOne();
  if (existing) {
    return existing;
  }
  return DuelSettingsModel.create({});
}

export async function listDuelOpponents(chatId: number, telegramId: number): Promise<UserHydratedDocument[]> {
  return UserModel.find({ chats: chatId, telegram_id: { $ne: telegramId } });
}

export async function createChallenge(
  chatId: number,
  challengerTelegramId: number,
  targetTelegramId: number,
): Promise<DuelChallengeHydratedDocument> {
  const settings = await getDuelSettings();
  if (!settings.is_enabled) {
    throw new Error('Дуелі зараз вимкнено адміністратором');
  }

  if (challengerTelegramId === targetTelegramId) {
    throw new Error('Не можна викликати на дуель самого себе');
  }

  const target = await UserModel.findOne({ chats: chatId, telegram_id: targetTelegramId });
  if (!target) {
    throw new Error('Цього учасника вже немає серед відомих боту в цьому чаті');
  }

  const pendingExisting = await DuelChallengeModel.findOne({
    challenger_telegram_id: challengerTelegramId,
    status: 'pending',
    expires_at: { $gt: new Date() },
  });
  if (pendingExisting) {
    throw new Error('У тебе вже є активний виклик на дуель - дочекайся відповіді');
  }

  const expiresAt = new Date(Date.now() + DUEL_CHALLENGE_TTL_MINUTES * 60 * 1000);
  return DuelChallengeModel.create({
    chat_id: chatId,
    challenger_telegram_id: challengerTelegramId,
    target_telegram_id: targetTelegramId,
    status: 'pending',
    expires_at: expiresAt,
    cleanup_at: new Date(expiresAt.getTime() + CLEANUP_GRACE_MS),
  });
}

async function getRespondablePendingChallenge(
  challengeId: string,
  respondingTelegramId: number,
): Promise<DuelChallengeHydratedDocument> {
  const challenge = await DuelChallengeModel.findById(challengeId);
  if (!challenge || challenge.status !== 'pending') {
    throw new Error('Цей виклик вже неактуальний');
  }
  if (challenge.expires_at.getTime() < Date.now()) {
    challenge.status = 'expired';
    await challenge.save();
    throw new Error('Час на відповідь вичерпано - виклик протерміновано');
  }
  if (challenge.target_telegram_id !== respondingTelegramId) {
    throw new Error('Відповісти на цей виклик може лише той, кого викликали');
  }
  return challenge;
}

export async function resolveChallenge(challengeId: string, respondingTelegramId: number): Promise<DuelResolution> {
  // Атомарний перехід pending -> accepted, щоб подвійний клік "Прийняти" (або
  // паралельний виклик resolveChallenge для того самого challengeId) не зіграв
  // дуель двічі - другий виклик просто не знайде документ і впаде в throw.
  const claimed = await DuelChallengeModel.findOneAndUpdate(
    {
      _id: challengeId,
      status: 'pending',
      target_telegram_id: respondingTelegramId,
      expires_at: { $gt: new Date() },
    },
    { $set: { status: 'accepted' } },
    { new: true },
  );
  if (!claimed) {
    throw new Error('Цей виклик вже неактуальний');
  }

  const [challenger, target] = await Promise.all([
    UserModel.findOne({ telegram_id: claimed.challenger_telegram_id }),
    UserModel.findOne({ telegram_id: claimed.target_telegram_id }),
  ]);
  if (!challenger || !target) {
    throw new Error('Одного з учасників дуелі більше не знайдено');
  }

  const settings = await getDuelSettings();
  const amount = roundCm(randomInRange(Math.abs(settings.min_delta), Math.abs(settings.max_delta)));

  const challengerWins = Math.random() < 0.5;
  const winner = challengerWins ? challenger : target;
  const loser = challengerWins ? target : challenger;

  const roundNumber = getCurrentRoundNumber();
  const questReward = await registerDuelWin(winner.telegram_id, roundNumber, settings.quest_targets);

  await applyDuelDelta(winner, questReward ? amount + questReward : amount);
  await applyDuelDelta(loser, -amount);

  await DuelHistoryModel.create({
    chat_id: claimed.chat_id,
    challenger_telegram_id: claimed.challenger_telegram_id,
    target_telegram_id: claimed.target_telegram_id,
    winner_telegram_id: winner.telegram_id,
    delta: amount,
  });

  return {
    winnerTelegramId: winner.telegram_id,
    loserTelegramId: loser.telegram_id,
    amount,
    questReward,
  };
}

export async function declineChallenge(
  challengeId: string,
  respondingTelegramId: number,
): Promise<DuelChallengeHydratedDocument> {
  const challenge = await getRespondablePendingChallenge(challengeId, respondingTelegramId);
  challenge.status = 'declined';
  await challenge.save();
  return challenge;
}

export async function getChatDuelHistory(chatId: number): Promise<DuelHistoryHydratedDocument[]> {
  return DuelHistoryModel.find({ chat_id: chatId }).sort({ created_at: -1 }).limit(DUEL_HISTORY_LIMIT);
}

export async function getPersonalDuelHistory(telegramId: number): Promise<DuelHistoryHydratedDocument[]> {
  return DuelHistoryModel.find({
    $or: [{ challenger_telegram_id: telegramId }, { target_telegram_id: telegramId }],
  })
    .sort({ created_at: -1 })
    .limit(DUEL_HISTORY_LIMIT);
}

export interface DuelWinStats {
  wins: number;
  total: number;
}

/** По ВСІЙ історії (не лише останніх DUEL_HISTORY_LIMIT) - для % перемог у /status. */
export async function getDuelWinStats(telegramId: number): Promise<DuelWinStats> {
  const [total, wins] = await Promise.all([
    DuelHistoryModel.countDocuments({
      $or: [{ challenger_telegram_id: telegramId }, { target_telegram_id: telegramId }],
    }),
    DuelHistoryModel.countDocuments({ winner_telegram_id: telegramId }),
  ]);
  return { wins, total };
}
