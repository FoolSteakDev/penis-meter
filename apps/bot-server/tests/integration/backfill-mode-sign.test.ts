import { describe, expect, it } from 'vitest';
import { UserModel } from '../../src/database/models/user.model';
import { backfillModeValueSign } from '../../src/database/backfill-mode-value-sign';

describe('backfillModeValueSign (phase 4.4/4.9)', () => {
  it('dry-run reports mismatched rows but writes nothing', async () => {
    await UserModel.create({ telegram_id: 1, first_name: 'A', value: -15, mode: 'grow' });
    await UserModel.create({ telegram_id: 2, first_name: 'B', value: 20, mode: 'drill' });
    await UserModel.create({ telegram_id: 3, first_name: 'C', value: 5, mode: 'grow' });

    const result = await backfillModeValueSign({ apply: false });

    expect(result.applied).toBe(false);
    expect(result.rows.map((r) => r.telegramId).sort()).toEqual([1, 2]);

    const [a, b, c] = await Promise.all([
      UserModel.findOne({ telegram_id: 1 }),
      UserModel.findOne({ telegram_id: 2 }),
      UserModel.findOne({ telegram_id: 3 }),
    ]);
    expect(a?.value).toBe(-15);
    expect(b?.value).toBe(20);
    expect(c?.value).toBe(5);
  });

  it('--apply zeroes out both mismatched categories and leaves correct rows untouched', async () => {
    await UserModel.create({ telegram_id: 1, first_name: 'A', value: -15, mode: 'grow' });
    await UserModel.create({ telegram_id: 2, first_name: 'B', value: 20, mode: 'drill' });
    await UserModel.create({ telegram_id: 3, first_name: 'C', value: 5, mode: 'grow' });
    await UserModel.create({ telegram_id: 4, first_name: 'D', value: -5, mode: 'drill' });

    const result = await backfillModeValueSign({ apply: true });
    expect(result.applied).toBe(true);
    expect(result.rows.map((r) => r.telegramId).sort()).toEqual([1, 2]);

    const [a, b, c, d] = await Promise.all([
      UserModel.findOne({ telegram_id: 1 }),
      UserModel.findOne({ telegram_id: 2 }),
      UserModel.findOne({ telegram_id: 3 }),
      UserModel.findOne({ telegram_id: 4 }),
    ]);
    expect(a?.value).toBe(0);
    expect(b?.value).toBe(0);
    expect(c?.value).toBe(5);
    expect(d?.value).toBe(-5);
  });

  it('does NOT touch season_growth/round_growth - unlike a conscious mode switch, this fixes pre-invariant state', async () => {
    await UserModel.create({
      telegram_id: 1,
      first_name: 'A',
      value: -15,
      mode: 'grow',
      season_growth: 200,
      round_growth: 100,
    });

    await backfillModeValueSign({ apply: true });

    const user = await UserModel.findOne({ telegram_id: 1 });
    expect(user?.value).toBe(0);
    expect(user?.season_growth).toBe(200);
    expect(user?.round_growth).toBe(100);
  });

  it('is idempotent - a second --apply run finds nothing left to fix', async () => {
    await UserModel.create({ telegram_id: 1, first_name: 'A', value: -15, mode: 'grow' });

    await backfillModeValueSign({ apply: true });
    const second = await backfillModeValueSign({ apply: true });

    expect(second.rows).toHaveLength(0);
  });
});
