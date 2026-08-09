import { describe, expect, it } from 'vitest';
import { ConditionModel } from '../../src/database/models/condition.model';
import { RoundModel } from '../../src/database/models/round.model';
import { UserModel } from '../../src/database/models/user.model';
import { ConcurrentMeasurementError, performMeasurement } from '../../src/services/measurement.service';
import { getCurrentRoundNumber, getRoundBounds, getSeasonNumber } from '../../src/utils/season-round.util';

describe('performMeasurement - concurrency (phase 1.3)', () => {
  it('10 parallel calls for the same user produce exactly one success', async () => {
    // Лише base-умова увімкнена й детермінована (min===max) - решта
    // shuffledConditions порожня, тому жоден виклик не б'є в реальні
    // зовнішні API (weather/crypto/currency).
    await ConditionModel.create({
      code: 'base',
      name: 'Base',
      is_enabled: true,
      chance: 0,
      min_delta: 1,
      max_delta: 1,
      delta_mode: 'range',
    });

    // Прибиває залежність від тематичних раундів: без цього ensureRoundInitialized
    // може випадково обрати легасі-тему з overrides на 'base' (напр. minDeltaOverride:
    // -6/maxDeltaOverride: 2), що зробить дельту недетермінованою. Адмін-тема з
    // condition_code, який не збігається з жодною реальною умовою, override'ів не дає.
    const roundNumber = getCurrentRoundNumber();
    const { startsAt, endsAt } = getRoundBounds(roundNumber);
    await RoundModel.create({
      round_number: roundNumber,
      season_number: getSeasonNumber(roundNumber),
      starts_at: startsAt,
      ends_at: endsAt,
      theme_name: 'Test theme',
      theme_description: 'Test',
      condition_code: 'unused_test_marker',
      condition_chance: 1,
      theme_source: 'admin',
    });

    const user = await UserModel.create({ telegram_id: 42, first_name: 'Racer', value: 10 });

    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () => performMeasurement(user, 1)),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected');

    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(9);
    for (const rejection of failed) {
      expect((rejection as PromiseRejectedResult).reason).toBeInstanceOf(ConcurrentMeasurementError);
    }

    const updated = await UserModel.findOne({ telegram_id: 42 });
    expect(updated?.round_measurement_count).toBe(1);
    expect(updated?.value).toBe(11);
  });
});
