import { describe, expect, it } from 'vitest';
import type { UserDocument } from '../database/models/user.model';
import type { AchievementProgressDocument } from '../database/models/achievement-progress.model';
import type { AchievementMetricContext } from './achievement.types';
import { ACHIEVEMENTS_BY_CODE } from './achievement.registry';
import { computeUnlocks, levelForValue } from './achievement.engine';

const METER = ACHIEVEMENTS_BY_CODE.get('meter')!; // thresholds 50/200/600/1500, rewards 5/10/20/50

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

function ctxWithMeterCount(totalMeasurements: number, storedLevel = 0): AchievementMetricContext {
  const levels = new Map<string, number>();
  if (storedLevel > 0) levels.set(METER.code, storedLevel);
  const progress = {
    telegram_id: 1,
    levels,
    counters: new Map([['total_measurements', totalMeasurements]]),
    condition_hits: new Map(),
    awarded_cm: 0,
    created_at: new Date(),
    updated_at: new Date(),
  } as unknown as AchievementProgressDocument;
  return { user: freshUser(), progress };
}

describe('levelForValue', () => {
  it('is 0 below the first threshold', () => {
    expect(levelForValue(METER, 49)).toBe(0);
  });

  it('is 4 at or above the last threshold', () => {
    expect(levelForValue(METER, 1500)).toBe(4);
    expect(levelForValue(METER, 100000)).toBe(4);
  });

  it('counts each crossed interval', () => {
    expect(levelForValue(METER, 50)).toBe(1);
    expect(levelForValue(METER, 200)).toBe(2);
    expect(levelForValue(METER, 600)).toBe(3);
  });
});

describe('computeUnlocks', () => {
  it('reports exactly the level delta', () => {
    const unlocks = computeUnlocks(ctxWithMeterCount(200), 1);
    const meterUnlock = unlocks.find((u) => u.code === 'meter');
    expect(meterUnlock).toMatchObject({ fromLevel: 0, toLevel: 2 });
  });

  it('sums rewards across every crossed level', () => {
    const unlocks = computeUnlocks(ctxWithMeterCount(600), 1);
    const meterUnlock = unlocks.find((u) => u.code === 'meter');
    expect(meterUnlock?.rewardCm).toBe(5 + 10 + 20);
  });

  it('returns nothing when the level has not changed', () => {
    const unlocks = computeUnlocks(ctxWithMeterCount(600, 3), 1);
    expect(unlocks.find((u) => u.code === 'meter')).toBeUndefined();
  });

  it('rounds the reward when the multiplier is fractional', () => {
    const unlocks = computeUnlocks(ctxWithMeterCount(50), 0.5);
    const meterUnlock = unlocks.find((u) => u.code === 'meter');
    expect(meterUnlock?.rewardCm).toBe(2.5);
  });
});
