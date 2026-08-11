import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConditionModel } from '../../src/database/models/condition.model';
import { DuelChallengeModel } from '../../src/database/models/duel-challenge.model';
import { RoundModel } from '../../src/database/models/round.model';
import { UserModel } from '../../src/database/models/user.model';
import { performMeasurement } from '../../src/services/measurement.service';
import { resolveChallenge } from '../../src/services/duel.service';
import * as duelCoin from '../../src/utils/duel-coin.util';
import { getCurrentRoundNumber, getRoundBounds, getSeasonNumber } from '../../src/utils/season-round.util';

/** Base-умова з детермінованою (min===max) позитивною дельтою + admin-тема без
 *  overrides на 'base' - той самий трюк, що в measurement.service.test.ts,
 *  щоб performMeasurement не залежав від Math.random()/зовнішніх API. */
async function seedDeterministicMeasurement(deltaCm: number): Promise<void> {
  await ConditionModel.create({
    code: 'base',
    name: 'Base',
    is_enabled: true,
    chance: 0,
    min_delta: deltaCm,
    max_delta: deltaCm,
    delta_mode: 'range',
  });

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
}

describe('drill mode - measurement (phase 3.3)', () => {
  it('inverts the modifier delta for a drill-mode user', async () => {
    await seedDeterministicMeasurement(3);
    const user = await UserModel.create({ telegram_id: 1, first_name: 'Driller', value: 10, mode: 'drill' });

    const outcome = await performMeasurement(user, 1);

    expect(outcome.delta).toBe(-3);
    expect(outcome.newValue).toBe(7);
  });

  it('does not invert the delta for a grow-mode user', async () => {
    await seedDeterministicMeasurement(3);
    const user = await UserModel.create({ telegram_id: 1, first_name: 'Grower', value: 10, mode: 'grow' });

    const outcome = await performMeasurement(user, 1);

    expect(outcome.delta).toBe(3);
    expect(outcome.newValue).toBe(13);
  });

  it('season_growth/round_growth go negative for a driller, but round_best_delta stays positive (progress)', async () => {
    await seedDeterministicMeasurement(3);
    const user = await UserModel.create({ telegram_id: 1, first_name: 'Driller', value: 10, mode: 'drill' });

    await performMeasurement(user, 1);

    const updated = await UserModel.findOne({ telegram_id: 1 });
    expect(updated?.season_growth).toBe(-3);
    expect(updated?.round_growth).toBe(-3);
    expect(updated?.round_best_delta).toBe(3);
  });
});

describe('drill mode - duel (phase 3.4)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('drill winner and grow loser both move further from zero: total value drops by 2×amount', async () => {
    // Монетка детермінована (challenger, тобто буровик, завжди перемагає) -
    // сценарій точно як у 3.8 плану, без залежності від Math.random().
    vi.spyOn(duelCoin, 'challengerWinsCoinFlip').mockReturnValue(true);

    await UserModel.create({ telegram_id: 1, first_name: 'Driller', value: -50, mode: 'drill' });
    await UserModel.create({ telegram_id: 2, first_name: 'Grower', value: 50, mode: 'grow' });

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const challenge = await DuelChallengeModel.create({
      chat_id: 1,
      challenger_telegram_id: 1,
      target_telegram_id: 2,
      status: 'pending',
      stake: 10,
      expires_at: expiresAt,
      cleanup_at: new Date(expiresAt.getTime() + 7 * 24 * 60 * 60 * 1000),
    });

    const result = await resolveChallenge(challenge._id.toString(), 2);
    expect(result.winnerTelegramId).toBe(1);
    expect(result.amount).toBe(10);

    const [drillerAfter, growerAfter] = await Promise.all([
      UserModel.findOne({ telegram_id: 1 }),
      UserModel.findOne({ telegram_id: 2 }),
    ]);

    expect(drillerAfter?.value).toBe(-60); // driller won: -50 - amount (глибше)
    expect(growerAfter?.value).toBe(40); // grower lost: 50 - amount

    const totalAfter = (drillerAfter?.value ?? 0) + (growerAfter?.value ?? 0);
    expect(totalAfter).toBe(-50 + 50 - 2 * result.amount);
  });
});
