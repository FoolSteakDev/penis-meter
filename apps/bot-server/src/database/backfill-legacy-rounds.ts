import { connectMongo } from './mongo.connection';
import { RoundModel } from './models/round.model';
import { getCurrentRoundNumber, getRoundBounds, getSeasonNumber } from '../utils/season-round.util';

/**
 * Одноразовий бекфіл Round-документів для раундів, що вже почались до
 * впровадження адмін-керованого розкладу (round.model.ts). Їхня реальна
 * тема (обрана старим чистим рандомом) ніде не збережена, тож просто
 * фіксуємо факт існування раунду з theme_source: 'legacy'. Ідемпотентно -
 * пропускає номери, для яких документ уже є.
 */
async function backfillLegacyRounds(): Promise<void> {
  await connectMongo();

  const currentRoundNumber = getCurrentRoundNumber();
  if (currentRoundNumber <= 0) {
    console.log('[backfill-legacy-rounds] season has not started yet, nothing to backfill');
    process.exit(0);
  }

  let created = 0;
  for (let roundNumber = 1; roundNumber <= currentRoundNumber; roundNumber += 1) {
    const existing = await RoundModel.findOne({ round_number: roundNumber });
    if (existing) {
      continue;
    }

    const { startsAt, endsAt } = getRoundBounds(roundNumber);
    await RoundModel.create({
      round_number: roundNumber,
      season_number: getSeasonNumber(roundNumber),
      starts_at: startsAt,
      ends_at: endsAt,
      theme_source: 'legacy',
    });
    created += 1;
  }

  console.log(`[backfill-legacy-rounds] created ${created} legacy round(s) (1..${currentRoundNumber})`);
  process.exit(0);
}

backfillLegacyRounds().catch((error) => {
  console.error('[backfill-legacy-rounds] failed', error);
  process.exit(1);
});
