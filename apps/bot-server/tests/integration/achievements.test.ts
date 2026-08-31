import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import type { Telegraf } from 'telegraf';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SEASON_START_DATE } from '../../src/config/constants';
import { AchievementProgressModel } from '../../src/database/models/achievement-progress.model';
import { AchievementSettingsModel } from '../../src/database/models/achievement-settings.model';
import { ConditionModel } from '../../src/database/models/condition.model';
import { DuelChallengeModel } from '../../src/database/models/duel-challenge.model';
import { GameStateModel } from '../../src/database/models/game-state.model';
import { RoundChatSnapshotModel } from '../../src/database/models/round-chat-snapshot.model';
import { RoundModel } from '../../src/database/models/round.model';
import { UserModel } from '../../src/database/models/user.model';
import { ACHIEVEMENTS_BY_CODE } from '../../src/achievements/achievement.registry';
import { invalidateAchievementSettingsCache } from '../../src/achievements/achievement-settings.service';
import { syncAchievements } from '../../src/achievements/achievement.service';
import { resolveChallenge } from '../../src/services/duel.service';
import { performMeasurement } from '../../src/services/measurement.service';
import { processRoundTransitions } from '../../src/services/round-processor.service';
import { getCurrentRoundNumber, getRoundBounds, getSeasonNumber } from '../../src/utils/season-round.util';
import * as duelCoin from '../../src/utils/duel-coin.util';

dayjs.extend(utc);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('achievement counters - measurement (phase 2.2)', () => {
  it('bumps total_measurements and the fired condition_hits code on a real measurement', async () => {
    await ConditionModel.create({
      code: 'base',
      name: 'Base',
      is_enabled: true,
      chance: 0,
      min_delta: 1,
      max_delta: 1,
      delta_mode: 'range',
    });
    await ConditionModel.create({
      code: 'test_hit',
      name: 'Test Hit',
      is_enabled: true,
      chance: 1,
      min_delta: 5,
      max_delta: 5,
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

    const user = await UserModel.create({ telegram_id: 500, first_name: 'Fresh', value: 10 });
    await performMeasurement(user, 1);

    const progress = await AchievementProgressModel.findOne({ telegram_id: 500 });
    expect(progress?.counters.get('total_measurements')).toBe(1);
    expect(progress?.condition_hits.get('test_hit')).toBe(1);
  });
});

describe('syncAchievements (phase 3.2)', () => {
  it('unlocks a level and applies the reward exactly once', async () => {
    await UserModel.create({ telegram_id: 501, first_name: 'Grower', value: 0, mode: 'grow' });
    await AchievementProgressModel.create({ telegram_id: 501, counters: new Map([['total_measurements', 50]]) });

    const unlocks = await syncAchievements(501);

    expect(unlocks).toHaveLength(1);
    expect(unlocks[0]).toMatchObject({ code: 'meter', fromLevel: 0, toLevel: 1 });

    const meter = ACHIEVEMENTS_BY_CODE.get('meter')!;
    const updatedUser = await UserModel.findOne({ telegram_id: 501 });
    expect(updatedUser?.value).toBe(meter.rewards[0]);

    // Ідемпотентність: без зміни лічильників повторний виклик нічого не робить.
    const secondCall = await syncAchievements(501);
    expect(secondCall).toEqual([]);
    const sameUser = await UserModel.findOne({ telegram_id: 501 });
    expect(sameUser?.value).toBe(meter.rewards[0]);
  });

  it('applies the reward in the direction of drill mode (negative)', async () => {
    await UserModel.create({ telegram_id: 502, first_name: 'Driller', value: 0, mode: 'drill' });
    await AchievementProgressModel.create({ telegram_id: 502, counters: new Map([['total_measurements', 50]]) });

    await syncAchievements(502);

    const meter = ACHIEVEMENTS_BY_CODE.get('meter')!;
    const updatedUser = await UserModel.findOne({ telegram_id: 502 });
    expect(updatedUser?.value).toBe(-meter.rewards[0]);

    const progress = await AchievementProgressModel.findOne({ telegram_id: 502 });
    expect(progress?.awarded_cm).toBeGreaterThan(0);
  });

  it('routes the reward through buildClampedValueUpdate (season/round growth move together)', async () => {
    await UserModel.create({
      telegram_id: 503,
      first_name: 'Zero',
      value: 0,
      mode: 'grow',
      season_growth: 0,
      round_growth: 0,
    });
    await AchievementProgressModel.create({ telegram_id: 503, counters: new Map([['total_measurements', 50]]) });

    await syncAchievements(503);

    const meter = ACHIEVEMENTS_BY_CODE.get('meter')!;
    const updatedUser = await UserModel.findOne({ telegram_id: 503 });
    expect(updatedUser?.value).toBe(meter.rewards[0]);
    expect(updatedUser?.value).toBeGreaterThanOrEqual(0);
    expect(updatedUser?.season_growth).toBe(meter.rewards[0]);
    expect(updatedUser?.round_growth).toBe(meter.rewards[0]);
  });

  it('cascades a reward into unlocking a second achievement within the pass limit', async () => {
    // value=29 - 1см до порогу 30 у 🍆 Габарити; total_measurements=50 відкриває
    // 📏 Метроман I (+5см), і саме ця нагорода штовхає value через поріг Габаритів.
    await UserModel.create({ telegram_id: 504, first_name: 'Cascade', value: 29, mode: 'grow' });
    await AchievementProgressModel.create({ telegram_id: 504, counters: new Map([['total_measurements', 50]]) });

    const unlocks = await syncAchievements(504);

    expect(unlocks.map((u) => u.code).sort()).toEqual(['meter', 'size']);

    const meter = ACHIEVEMENTS_BY_CODE.get('meter')!;
    const size = ACHIEVEMENTS_BY_CODE.get('size')!;
    const updatedUser = await UserModel.findOne({ telegram_id: 504 });
    expect(updatedUser?.value).toBe(29 + meter.rewards[0] + size.rewards[0]);
  });

  it('does nothing when the achievement system is disabled', async () => {
    await AchievementSettingsModel.create({ is_enabled: false });
    invalidateAchievementSettingsCache();
    await UserModel.create({ telegram_id: 900, first_name: 'Off', value: 0, mode: 'grow' });
    await AchievementProgressModel.create({ telegram_id: 900, counters: new Map([['total_measurements', 50]]) });

    const unlocks = await syncAchievements(900);

    expect(unlocks).toEqual([]);
    const updatedUser = await UserModel.findOne({ telegram_id: 900 });
    expect(updatedUser?.value).toBe(0);
  });
});

describe('achievement counters - duel (phase 2.3)', () => {
  it('bumps duel counters for the winner and the loser', async () => {
    vi.spyOn(duelCoin, 'challengerWinsCoinFlip').mockReturnValue(true);
    await UserModel.create({ telegram_id: 601, first_name: 'Challenger', value: 50, mode: 'grow' });
    await UserModel.create({ telegram_id: 602, first_name: 'Target', value: 50, mode: 'grow' });

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const challenge = await DuelChallengeModel.create({
      chat_id: 1,
      challenger_telegram_id: 601,
      target_telegram_id: 602,
      status: 'pending',
      stake: 5,
      expires_at: expiresAt,
      cleanup_at: new Date(expiresAt.getTime() + 7 * 24 * 60 * 60 * 1000),
    });

    const result = await resolveChallenge(challenge._id.toString(), 602);
    expect(result.winnerTelegramId).toBe(601);

    const winnerProgress = await AchievementProgressModel.findOne({ telegram_id: 601 });
    expect(winnerProgress?.counters.get('duel_total')).toBe(1);
    expect(winnerProgress?.counters.get('duel_wins')).toBe(1);
    expect(winnerProgress?.counters.get('duel_win_streak_current')).toBe(1);
    expect(winnerProgress?.counters.get('duel_win_streak_best')).toBe(1);
    expect(winnerProgress?.counters.get('max_stake_won')).toBe(result.amount);

    const loserProgress = await AchievementProgressModel.findOne({ telegram_id: 602 });
    expect(loserProgress?.counters.get('duel_total')).toBe(1);
    expect(loserProgress?.counters.get('duel_win_streak_current')).toBe(0);
    expect(loserProgress?.counters.get('duel_wins') ?? 0).toBe(0);
  });
});

describe('achievement counters - round end (phase 2.5)', () => {
  it('bumps top3_round_finishes and climber_entries at round end', async () => {
    await GameStateModel.create({ last_processed_round_number: 3, season_start_reset_done: true });
    await RoundChatSnapshotModel.create({ round_number: 4, chat_id: 555, top3_telegram_ids: [901, 902, 903] });
    await UserModel.create({ telegram_id: 701, first_name: 'Climber', value: 100, chats: [555] });
    await UserModel.create({ telegram_id: 702, first_name: 'Other', value: 1, chats: [555] });

    // Раунд 5 (день 28 від SEASON_START_DATE) -> раунд, що завершується, це раунд 4,
    // для якого вище засіяно знімок топ-3 (той самий трюк, що й у round-processor.service.test.ts).
    const atRound5 = dayjs.utc(SEASON_START_DATE).add(28, 'day');
    const fakeBot = { telegram: { sendMessage: vi.fn().mockResolvedValue(undefined) } } as unknown as Telegraf;

    await processRoundTransitions(fakeBot, atRound5);

    const progress = await AchievementProgressModel.findOne({ telegram_id: 701 });
    expect(progress?.counters.get('top3_round_finishes')).toBe(1);
    expect(progress?.counters.get('climber_entries')).toBe(1);
  });
});
