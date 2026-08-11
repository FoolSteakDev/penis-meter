import { describe, expect, it } from 'vitest';
import type { ConditionDto } from '../dto/condition.dto';
import type { UserDto } from '../dto/user.dto';
import { CriticalModifier } from './critical.modifier';
import type { GrowthModifierContext } from './growth-modifier.types';

const FAKE_USER: UserDto = {
  id: 'u1',
  telegramId: 1,
  username: null,
  firstName: 'Test',
  value: 10,
  lastMeasurementAt: null,
  chats: [],
  work: { schedule: [5, 2], lastWeekend: null },
  seasonGrowth: 0,
  roundGrowth: 0,
  roundBestDelta: null,
  roundMeasurementCount: 0,
  titles: [],
  mode: 'grow',
  modeChangedAt: null,
  experience: 0,
  streakCurrent: 0,
  streakBest: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function buildContext(minDelta: number, maxDelta: number): GrowthModifierContext {
  const condition: ConditionDto = {
    id: 'c1',
    code: 'critical',
    name: 'Critical',
    description: null,
    isEnabled: true,
    chance: 1,
    minDelta,
    maxDelta,
    deltaMode: 'range',
    fixedValues: [],
    config: {},
    isProtected: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return { user: FAKE_USER, chatId: 1, condition };
}

async function assertDeltaAlwaysInRange(minDelta: number, maxDelta: number, runs = 1000): Promise<void> {
  const modifier = new CriticalModifier();
  const context = buildContext(minDelta, maxDelta);
  for (let i = 0; i < runs; i += 1) {
    const { delta } = await modifier.apply(context);
    expect(delta).toBeGreaterThanOrEqual(minDelta);
    expect(delta).toBeLessThanOrEqual(maxDelta);
  }
}

describe('CriticalModifier - after 2.1 fix, delta always within [minDelta, maxDelta]', () => {
  it('normal range (minDelta < 0 < maxDelta)', async () => {
    await assertDeltaAlwaysInRange(-5, 5);
  });

  it('minDelta > 0 (fully positive range - used to invert min/max)', async () => {
    await assertDeltaAlwaysInRange(1, 5);
  });

  it('maxDelta < 0 (fully negative range - used to invert min/max)', async () => {
    await assertDeltaAlwaysInRange(-5, -1);
  });

  it('minDelta === maxDelta === 0 returns a neutral zero delta', async () => {
    const modifier = new CriticalModifier();
    const { delta } = await modifier.apply(buildContext(0, 0));
    expect(delta).toBe(0);
  });
});
