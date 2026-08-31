import { ACHIEVEMENT_CASCADE_PASSES } from '../config/constants';
import { AchievementProgressModel } from '../database/models/achievement-progress.model';
import { UserModel } from '../database/models/user.model';
import { modeSign } from '../utils/mode.util';
import { roundCm } from '../utils/number.util';
import { buildClampedValueUpdate } from '../utils/value-update.util';
import { getAchievementSettings } from './achievement-settings.service';
import { getOrCreateProgress } from './achievement-progress.service';
import { computeUnlocks, type AchievementUnlock } from './achievement.engine';

export interface SyncOptions {
  /** false - рівні виставляються, але см не нараховуються (бекфіл). Дефолт true. */
  awardRewards?: boolean;
}

export async function syncAchievements(
  telegramId: number,
  options: SyncOptions = {},
): Promise<AchievementUnlock[]> {
  const settings = await getAchievementSettings();
  if (!settings.is_enabled) return [];

  const all: AchievementUnlock[] = [];
  for (let pass = 0; pass < ACHIEVEMENT_CASCADE_PASSES; pass += 1) {
    const user = await UserModel.findOne({ telegram_id: telegramId });
    if (!user) break;
    const progress = await getOrCreateProgress(telegramId);

    const unlocks = computeUnlocks({ user, progress }, settings.reward_multiplier);
    if (unlocks.length === 0) break;

    const levelSet = Object.fromEntries(unlocks.map((u) => [`levels.${u.code}`, u.toLevel]));
    const totalReward =
      options.awardRewards === false ? 0 : roundCm(unlocks.reduce((sum, u) => sum + u.rewardCm, 0));

    // Рівень фіксуємо ЗАВЖДИ і ПЕРШИМ. Якщо процес упаде між цими двома
    // апдейтами, гравець втратить нагороду - але не отримає її двічі, що гірше.
    await AchievementProgressModel.updateOne(
      { telegram_id: telegramId },
      { $set: levelSet, $inc: { awarded_cm: totalReward } },
    );
    if (totalReward !== 0) {
      await UserModel.updateOne(
        { telegram_id: telegramId },
        buildClampedValueUpdate(totalReward * modeSign(user.mode), user.mode),
      );
    }
    all.push(...unlocks);
    if (totalReward === 0) break; // без нагороди каскаду бути не може
  }
  return all;
}

export async function safeSync(telegramId: number, options?: SyncOptions): Promise<AchievementUnlock[]> {
  try {
    return await syncAchievements(telegramId, options);
  } catch (error) {
    console.error('[achievements] sync failed', error);
    return [];
  }
}

/**
 * Скидання прогресу. `telegramId: null` - усім гравцям. Скидання НЕ забирає
 * вже нараховані см (value): обнулити його назад означало б розібрати сотні
 * вимірів і дуелей, що на нього наклались.
 */
export async function resetAchievements(telegramId: number | null, keepCounters: boolean): Promise<number> {
  const filter = telegramId === null ? {} : { telegram_id: telegramId };
  const update = keepCounters
    ? { $set: { levels: {}, awarded_cm: 0 } }
    : { $set: { levels: {}, counters: {}, condition_hits: {}, awarded_cm: 0 } };
  const result = await AchievementProgressModel.updateMany(filter, update);
  return result.modifiedCount;
}
