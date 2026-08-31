import { connectMongo } from './mongo.connection';
import { AchievementProgressModel } from './models/achievement-progress.model';
import { DuelHistoryModel } from './models/duel-history.model';
import { UserModel } from './models/user.model';
import { syncAchievements } from '../achievements/achievement.service';
import { progress } from '../utils/mode.util';
import { roundCm } from '../utils/number.util';

interface DuelCounters {
  duelTotal: number;
  duelWins: number;
  duelInitiatedAccepted: number;
  duelDefendedWins: number;
  maxStakeWon: number;
  duelWinStreakBest: number;
}

/** Один прохід по відсортованій за created_at історії дуелей гравця. */
async function computeDuelCounters(telegramId: number): Promise<DuelCounters> {
  const history = await DuelHistoryModel.find({
    $or: [{ challenger_telegram_id: telegramId }, { target_telegram_id: telegramId }],
  }).sort({ created_at: 1 });

  const counters: DuelCounters = {
    duelTotal: 0,
    duelWins: 0,
    duelInitiatedAccepted: 0,
    duelDefendedWins: 0,
    maxStakeWon: 0,
    duelWinStreakBest: 0,
  };
  let winStreakCurrent = 0;

  for (const entry of history) {
    counters.duelTotal += 1;
    const isChallenger = entry.challenger_telegram_id === telegramId;
    if (isChallenger) {
      counters.duelInitiatedAccepted += 1;
    }

    const won = entry.winner_telegram_id === telegramId;
    if (won) {
      counters.duelWins += 1;
      if (!isChallenger) {
        counters.duelDefendedWins += 1;
      }
      counters.maxStakeWon = Math.max(counters.maxStakeWon, entry.delta);
      winStreakCurrent += 1;
      counters.duelWinStreakBest = Math.max(counters.duelWinStreakBest, winStreakCurrent);
    } else {
      winStreakCurrent = 0;
    }
  }

  return counters;
}

export interface AchievementBackfillSummary {
  usersProcessed: number;
  levelsSet: number;
  cmAwarded: number;
}

/**
 * Виставляє лічильники й рівні досягнень для ВСІХ гравців з того, що вже є
 * в БД. Без `--award` (дефолт) рівні виставляються мовчки й безкоштовно -
 * гравці бачать чесний стан, але не отримують разом +сотні см заднім числом.
 *
 * Лічильники, яких ніхто досі не рахував (total_measurements, night_*,
 * punctual_*, drill_*, theme_*, condition_hits, top3_round_finishes,
 * climber_entries, mode_switches, best_progress_delta, worst_progress_delta,
 * best_season_growth) лишаються 0 - відновити їх нізвідки, гравці доб'ють
 * наступними вимірами.
 */
export async function backfillAchievements({ award }: { award: boolean }): Promise<AchievementBackfillSummary> {
  const users = await UserModel.find({});

  let levelsSet = 0;
  let cmAwarded = 0;

  for (const user of users) {
    const duelCounters = await computeDuelCounters(user.telegram_id);
    // Історії значень немає, беремо поточне - свідомо занижена оцінка.
    const peakProgress = roundCm(Math.max(0, progress(user.value, user.mode)));

    await AchievementProgressModel.updateOne(
      { telegram_id: user.telegram_id },
      {
        $set: {
          'counters.duel_total': duelCounters.duelTotal,
          'counters.duel_wins': duelCounters.duelWins,
          'counters.duel_initiated_accepted': duelCounters.duelInitiatedAccepted,
          'counters.duel_defended_wins': duelCounters.duelDefendedWins,
          'counters.max_stake_won': duelCounters.maxStakeWon,
          'counters.duel_win_streak_best': duelCounters.duelWinStreakBest,
          'counters.peak_progress': peakProgress,
          'counters.best_round_measurement_count': user.round_measurement_count,
        },
        $setOnInsert: { telegram_id: user.telegram_id },
      },
      { upsert: true },
    );

    const unlocks = await syncAchievements(user.telegram_id, { awardRewards: award });
    for (const unlock of unlocks) {
      levelsSet += unlock.toLevel - unlock.fromLevel;
      cmAwarded += unlock.rewardCm;
    }
  }

  return { usersProcessed: users.length, levelsSet, cmAwarded: roundCm(cmAwarded) };
}

async function main(): Promise<void> {
  await connectMongo();

  const award = process.argv.includes('--award');
  const summary = await backfillAchievements({ award });

  console.log(`[backfill-achievements] гравців оброблено: ${summary.usersProcessed}`);
  console.log(`[backfill-achievements] рівнів виставлено: ${summary.levelsSet}`);
  console.log(
    `[backfill-achievements] см видано: ${summary.cmAwarded}${award ? '' : ' (dry-run, запусти з --award, щоб видати)'}`,
  );

  process.exit(0);
}

if (require.main === module) {
  main().catch((error) => {
    console.error('[backfill-achievements] failed', error);
    process.exit(1);
  });
}
