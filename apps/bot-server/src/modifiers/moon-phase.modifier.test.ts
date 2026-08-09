import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConditionDto } from '../dto/condition.dto';
import type { UserDto } from '../dto/user.dto';
import { getCurrentMoonPhase } from '../services/moon-phase.service';
import type { GrowthModifierContext } from './growth-modifier.types';
import { MoonPhaseModifier } from './moon-phase.modifier';

vi.mock('../services/moon-phase.service', () => ({
  getCurrentMoonPhase: vi.fn(),
}));

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
  experience: 0,
  streakCurrent: 0,
  streakBest: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function buildContext(
  minDelta: number,
  maxDelta: number,
  overrides: Partial<Pick<ConditionDto, 'deltaMode' | 'fixedValues'>> = {},
): GrowthModifierContext {
  const condition: ConditionDto = {
    id: 'c1',
    code: 'moon_phase',
    name: 'Moon',
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
    ...overrides,
  };
  return { user: FAKE_USER, chatId: 1, condition };
}

function mockFullness(fullness: number, name = 'test-phase'): void {
  vi.mocked(getCurrentMoonPhase).mockReturnValue({ phase: 0, fullness, name });
}

beforeEach(() => {
  mockFullness(0.5);
});

describe('MoonPhaseModifier - after 2.2 fix', () => {
  it('delta stays within [minDelta, maxDelta] across the full fullness range', async () => {
    const modifier = new MoonPhaseModifier();
    for (const fullness of [0, 0.25, 0.5, 0.75, 1]) {
      mockFullness(fullness);
      const context = buildContext(-5, 5);
      for (let i = 0; i < 200; i += 1) {
        const { delta } = await modifier.apply(context);
        expect(delta).toBeGreaterThanOrEqual(-5);
        expect(delta).toBeLessThanOrEqual(5);
      }
    }
  });

  it('bonus is positive for a full moon (fullness = 1)', async () => {
    mockFullness(1, 'Повний місяць');
    const modifier = new MoonPhaseModifier();
    // baseDelta зафіксовано на 0 через fixed_list з єдиним значенням - лишається лише знак бонусу.
    const context = buildContext(-10, 10, { deltaMode: 'fixed_list', fixedValues: [0] });
    const { delta } = await modifier.apply(context);
    expect(delta).toBeGreaterThan(0);
  });

  it('bonus is negative for a new moon (fullness = 0) - the bug being fixed', async () => {
    mockFullness(0, 'Молодик');
    const modifier = new MoonPhaseModifier();
    const context = buildContext(-10, 10, { deltaMode: 'fixed_list', fixedValues: [0] });
    const { delta } = await modifier.apply(context);
    expect(delta).toBeLessThan(0);
  });
});
