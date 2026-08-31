import { describe, expect, it } from 'vitest';
import type { UserDocument } from '../database/models/user.model';
import type { AchievementProgressDocument } from '../database/models/achievement-progress.model';
import type { AchievementMetricContext } from './achievement.types';
import { ACHIEVEMENTS, ACHIEVEMENTS_BY_CODE } from './achievement.registry';

function freshUser(): UserDocument {
  return {
    telegram_id: 1,
    username: null,
    first_name: 'Test',
    value: 0,
    last_measurement_at: null,
    chats: [],
    work: { schedule: [5, 2], last_weekend: new Date() },
    season_growth: 0,
    round_growth: 0,
    round_best_delta: null,
    round_measurement_count: 0,
    titles: [],
    mode: 'grow',
    mode_changed_at: null,
    experience: 0,
    streak_current: 0,
    streak_best: 0,
    created_at: new Date(),
    updated_at: new Date(),
  } as unknown as UserDocument;
}

function freshProgress(): AchievementProgressDocument {
  return {
    telegram_id: 1,
    levels: new Map(),
    counters: new Map(),
    condition_hits: new Map(),
    awarded_cm: 0,
    created_at: new Date(),
    updated_at: new Date(),
  } as unknown as AchievementProgressDocument;
}

const REWARD_RANGES: readonly [number, number][] = [
  [3, 5],
  [8, 10],
  [15, 20],
  [40, 50],
];

describe('achievement registry', () => {
  it('has 30 achievements with unique codes', () => {
    expect(ACHIEVEMENTS).toHaveLength(30);
    const codes = ACHIEVEMENTS.map((def) => def.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('has strictly increasing thresholds', () => {
    for (const def of ACHIEVEMENTS) {
      const [t1, t2, t3, t4] = def.thresholds;
      expect(t1).toBeLessThan(t2);
      expect(t2).toBeLessThan(t3);
      expect(t3).toBeLessThan(t4);
    }
  });

  it('keeps each level reward within its allowed range', () => {
    for (const def of ACHIEVEMENTS) {
      def.rewards.forEach((reward, index) => {
        const [min, max] = REWARD_RANGES[index];
        expect(reward, `${def.code} level ${index + 1}`).toBeGreaterThanOrEqual(min);
        expect(reward, `${def.code} level ${index + 1}`).toBeLessThanOrEqual(max);
      });
    }
  });

  it('evaluates value() safely for a brand-new player', () => {
    const ctx: AchievementMetricContext = { user: freshUser(), progress: freshProgress() };
    for (const def of ACHIEVEMENTS) {
      const value = def.value(ctx);
      expect(Number.isFinite(value), def.code).toBe(true);
      expect(value, def.code).toBeGreaterThanOrEqual(0);
    }
  });

  it('gives slump a value of 0 for a brand-new player', () => {
    const ctx: AchievementMetricContext = { user: freshUser(), progress: freshProgress() };
    expect(ACHIEVEMENTS_BY_CODE.get('slump')?.value(ctx)).toBe(0);
  });
});
