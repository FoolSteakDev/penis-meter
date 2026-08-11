import type { ConditionDto } from '../dto/condition.dto';
import type { UserDto } from '../dto/user.dto';
import type { GrowthModifierContext } from './growth-modifier.types';

export const FAKE_USER: UserDto = {
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

export function buildContext(
  overrides: Partial<ConditionDto> = {},
  user: UserDto = FAKE_USER,
): GrowthModifierContext {
  const condition: ConditionDto = {
    id: 'c1',
    code: 'test',
    name: 'Test',
    description: null,
    isEnabled: true,
    chance: 1,
    minDelta: -5,
    maxDelta: 5,
    deltaMode: 'range',
    fixedValues: [],
    config: {},
    isProtected: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
  return { user, chatId: 1, condition };
}
