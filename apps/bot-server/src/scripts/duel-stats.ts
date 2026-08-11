import { connectMongo } from '../database/mongo.connection';
import { DuelHistoryModel } from '../database/models/duel-history.model';
import { UserModel } from '../database/models/user.model';
import { twoSidedBinomialP } from '../utils/stats.util';
import { userLabel } from '../utils/user-label.util';

const MIN_DUELS_FOR_PLAYER_ROW = 20;

function formatPercent(wins: number, total: number): string {
  if (total === 0) {
    return '0.0%';
  }
  return `${((wins / total) * 100).toFixed(1)}%`;
}

/**
 * Одноразовий/повторюваний аудит-скрипт (не частина рантайму бота): читає
 * ВСЮ duel-history й рахує win-rate/p-value, щоб питання "чи дуель чесна"
 * закривалось командою за 5 секунд, а не дискусією (див. 2.5 плану).
 */
async function duelStats(): Promise<void> {
  await connectMongo();

  const history = await DuelHistoryModel.find().lean();
  const total = history.length;

  console.log(`Всього дуелей: ${total}`);

  if (total === 0) {
    process.exit(0);
  }

  const challengerWins = history.filter((h) => h.winner_telegram_id === h.challenger_telegram_id).length;
  console.log(
    `Перемоги ініціатора: ${challengerWins} / ${total} (${formatPercent(challengerWins, total)})  p = ${twoSidedBinomialP(challengerWins, total).toFixed(3)}`,
  );

  console.log(`\n--- по гравцях (>= ${MIN_DUELS_FOR_PLAYER_ROW} дуелей) ---`);
  console.log('label            wins/total   win%    p');

  const perPlayer = new Map<number, { wins: number; total: number }>();
  for (const entry of history) {
    for (const telegramId of [entry.challenger_telegram_id, entry.target_telegram_id]) {
      const stats = perPlayer.get(telegramId) ?? { wins: 0, total: 0 };
      stats.total += 1;
      if (entry.winner_telegram_id === telegramId) {
        stats.wins += 1;
      }
      perPlayer.set(telegramId, stats);
    }
  }

  const eligiblePlayerIds = [...perPlayer.entries()]
    .filter(([, stats]) => stats.total >= MIN_DUELS_FOR_PLAYER_ROW)
    .sort((a, b) => b[1].total - a[1].total);

  const users = await UserModel.find({ telegram_id: { $in: eligiblePlayerIds.map(([id]) => id) } }).lean();
  const usersById = new Map(users.map((u) => [u.telegram_id, u]));

  for (const [telegramId, stats] of eligiblePlayerIds) {
    const label = userLabel(usersById.get(telegramId));
    const p = twoSidedBinomialP(stats.wins, stats.total);
    console.log(
      `${label.padEnd(16)} ${`${stats.wins}/${stats.total}`.padEnd(12)} ${formatPercent(stats.wins, stats.total).padEnd(7)} ${p.toFixed(3)}`,
    );
  }

  console.log('\n--- перевірка на асиметрію ролі ---');
  console.log(`як ініціатор:  ${challengerWins}/${total} (${formatPercent(challengerWins, total)})`);
  const targetWins = total - challengerWins;
  console.log(`як ціль:       ${targetWins}/${total} (${formatPercent(targetWins, total)})`);

  process.exit(0);
}

duelStats().catch((error) => {
  console.error('[duel-stats] failed', error);
  process.exit(1);
});
