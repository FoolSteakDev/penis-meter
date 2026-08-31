import {
  AchievementProgressModel,
  type AchievementProgressHydratedDocument,
} from '../database/models/achievement-progress.model';

export interface CounterOps {
  inc?: Record<string, number>;
  max?: Record<string, number>;
  min?: Record<string, number>;
  set?: Record<string, number>;
}

/**
 * Один атомарний upsert. Ключі — повні точкові шляхи ('counters.duel_wins',
 * 'condition_hits.critical'). $max/$min ставлять поле, якщо його ще немає, тож
 * ініціалізувати лічильники наперед не треба.
 */
export async function bumpAchievementCounters(
  telegramId: number,
  ops: CounterOps,
): Promise<AchievementProgressHydratedDocument> {
  const update: Record<string, unknown> = {};
  if (ops.inc && Object.keys(ops.inc).length) update.$inc = ops.inc;
  if (ops.max && Object.keys(ops.max).length) update.$max = ops.max;
  if (ops.min && Object.keys(ops.min).length) update.$min = ops.min;
  if (ops.set && Object.keys(ops.set).length) update.$set = ops.set;
  const result = await AchievementProgressModel.findOneAndUpdate(
    { telegram_id: telegramId },
    { ...update, $setOnInsert: { telegram_id: telegramId } },
    { new: true, upsert: true },
  );
  return result as AchievementProgressHydratedDocument;
}

/** Обгортка «не впасти»: підсистема досягнень ніколи не ламає основний флоу. */
export async function safeBump(telegramId: number, ops: CounterOps): Promise<void> {
  try {
    await bumpAchievementCounters(telegramId, ops);
  } catch (error) {
    console.error('[achievements] failed to bump counters', error);
  }
}

export async function getOrCreateProgress(telegramId: number): Promise<AchievementProgressHydratedDocument> {
  const existing = await AchievementProgressModel.findOne({ telegram_id: telegramId });
  if (existing) return existing;
  return AchievementProgressModel.create({ telegram_id: telegramId });
}

/**
 * $max не вміє порівнювати два поля одного документа (порівняння поле-з-полем
 * вимагало б pipeline-апдейта заради одного числа - не варте того), тож
 * читаємо документ і робимо другий, окремий апдейт.
 */
export async function syncWinStreakBest(telegramId: number): Promise<void> {
  const progress = await getOrCreateProgress(telegramId);
  const current = progress.counters?.get('duel_win_streak_current') ?? 0;
  await bumpAchievementCounters(telegramId, { max: { 'counters.duel_win_streak_best': current } });
}
