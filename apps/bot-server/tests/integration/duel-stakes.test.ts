import { describe, expect, it } from 'vitest';
import { DuelSettingsModel } from '../../src/database/models/duel-settings.model';
import { UserModel } from '../../src/database/models/user.model';
import { computeAutoStake, getStakeBounds, parseStakeInput } from '../../src/services/duel.service';

describe('getStakeBounds', () => {
  it('caps at the lower of two large positive values', async () => {
    await UserModel.create({ telegram_id: 1, first_name: 'A', value: 50 });
    await UserModel.create({ telegram_id: 2, first_name: 'B', value: 30 });
    expect(await getStakeBounds(1, 2)).toEqual({ min: 1, max: 30 });
  });

  it('falls back to the fixed ceiling when one participant has value === 0', async () => {
    await UserModel.create({ telegram_id: 1, first_name: 'A', value: 0 });
    await UserModel.create({ telegram_id: 2, first_name: 'B', value: 30 });
    expect(await getStakeBounds(1, 2)).toEqual({ min: 1, max: 250 });
  });

  it('falls back to the fixed ceiling when one participant has negative value', async () => {
    await UserModel.create({ telegram_id: 1, first_name: 'A', value: -15 });
    await UserModel.create({ telegram_id: 2, first_name: 'B', value: 30 });
    expect(await getStakeBounds(1, 2)).toEqual({ min: 1, max: 250 });
  });

  it('caps by progress for a drill (negative value) vs a grow challenger', async () => {
    // drill: value -50 -> progress +50; grow: value 30 -> progress +30. min(50, 30) = 30.
    await UserModel.create({ telegram_id: 1, first_name: 'A', value: -50, mode: 'drill' });
    await UserModel.create({ telegram_id: 2, first_name: 'B', value: 30, mode: 'grow' });
    expect(await getStakeBounds(1, 2)).toEqual({ min: 1, max: 30 });
  });

  it('falls back to the fixed ceiling when a drill player has non-positive progress (value >= 0)', async () => {
    // drill: value 15 -> progress -15 <= 0.
    await UserModel.create({ telegram_id: 1, first_name: 'A', value: 15, mode: 'drill' });
    await UserModel.create({ telegram_id: 2, first_name: 'B', value: 30, mode: 'grow' });
    expect(await getStakeBounds(1, 2)).toEqual({ min: 1, max: 250 });
  });
});

describe('computeAutoStake', () => {
  it('always stays within getStakeBounds for 1000 runs', async () => {
    await UserModel.create({ telegram_id: 1, first_name: 'A', value: 50 });
    await UserModel.create({ telegram_id: 2, first_name: 'B', value: 30 });
    await DuelSettingsModel.create({ min_delta: 1, max_delta: 20 });

    const bounds = await getStakeBounds(1, 2);
    for (let i = 0; i < 1000; i += 1) {
      const stake = await computeAutoStake(1, 2);
      expect(stake).toBeGreaterThanOrEqual(bounds.min);
      expect(stake).toBeLessThanOrEqual(bounds.max);
    }
  });
});

describe('parseStakeInput', () => {
  it.each([
    ['5', 5],
    ['3,5', 3.5],
    ['3.5', 3.5],
    ['-1', null],
    ['abc', null],
    ['999999', 999999],
    ['', null],
  ])('parses %s -> %s', (input, expected) => {
    expect(parseStakeInput(input)).toBe(expected);
  });
});
