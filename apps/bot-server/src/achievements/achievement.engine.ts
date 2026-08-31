import { roundCm } from '../utils/number.util';
import type { AchievementDefinition, AchievementMetricContext } from './achievement.types';
import { ACHIEVEMENTS } from './achievement.registry';

/** Скільки порогів пройдено: 0..4. Пороги строго за зростанням (гарантує тест). */
export function levelForValue(def: AchievementDefinition, value: number): number {
  let level = 0;
  for (const threshold of def.thresholds) {
    if (value >= threshold) level += 1;
    else break;
  }
  return level;
}

export interface AchievementUnlock {
  code: string;
  emoji: string;
  name: string;
  fromLevel: number;
  toLevel: number;
  rewardCm: number;
}

/** Які рівні щойно відкрились. Рівень не може впасти — беремо max(stored, computed). */
export function computeUnlocks(
  ctx: AchievementMetricContext,
  rewardMultiplier: number,
): AchievementUnlock[] {
  const unlocks: AchievementUnlock[] = [];

  for (const def of ACHIEVEMENTS) {
    const stored = ctx.progress.levels?.get(def.code) ?? 0;
    const computed = levelForValue(def, def.value(ctx));
    const next = Math.max(stored, computed);
    if (next <= stored) continue;

    let rewardCm = 0;
    for (let level = stored + 1; level <= next; level += 1) {
      rewardCm += def.rewards[level - 1];
    }
    rewardCm = roundCm(rewardCm * rewardMultiplier);

    unlocks.push({
      code: def.code,
      emoji: def.emoji,
      name: def.name,
      fromLevel: stored,
      toLevel: next,
      rewardCm,
    });
  }

  return unlocks;
}

export const ROMAN = ['', 'I', 'II', 'III', 'IV'] as const;
