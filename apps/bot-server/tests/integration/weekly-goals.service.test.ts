import { describe, expect, it } from 'vitest';
import { MEASUREMENT_COUNT_QUEST_TIERS } from '../../src/config/constants';
import { UserModel } from '../../src/database/models/user.model';
import { processMeasurementCountQuests } from '../../src/services/weekly-goals.service';

describe('processMeasurementCountQuests - season_growth tracking (phase 1.1)', () => {
  it('rewards value and season_growth by the same amount', async () => {
    const [threshold, rewardCm] = MEASUREMENT_COUNT_QUEST_TIERS[0];
    const user = await UserModel.create({
      telegram_id: 7,
      first_name: 'Grinder',
      value: 10,
      round_measurement_count: threshold,
      season_growth: 0,
      round_growth: 0,
    });

    const awards = await processMeasurementCountQuests([user]);

    expect(awards).toHaveLength(1);
    expect(awards[0].rewardCm).toBe(rewardCm);

    const updated = await UserModel.findOne({ telegram_id: 7 });
    expect(updated?.value).toBe(10 + rewardCm);
    // Головна перевірка фази 1.1: season_growth зростає на ту саму
    // величину, що й value - раніше квест оновлював лише value.
    expect(updated?.season_growth).toBe(rewardCm);
    expect(updated?.round_growth).toBe(rewardCm);
  });
});
