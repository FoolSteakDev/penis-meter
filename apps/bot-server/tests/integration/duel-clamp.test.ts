import { afterEach, describe, expect, it, vi } from 'vitest';
import { DuelChallengeModel } from '../../src/database/models/duel-challenge.model';
import { UserModel } from '../../src/database/models/user.model';
import { resolveChallenge } from '../../src/services/duel.service';
import * as duelCoin from '../../src/utils/duel-coin.util';
import * as questService from '../../src/services/quest.service';

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * 4.9: переможений на 3 см (progress) при ставці 12 -> loserApplied === 3,
 * winnerValue/loserValue збігаються з БД. Симулюємо ТОЙ САМЕ паралельний
 * /metr, заради якого існує 4.2: під час await registerDuelWin (реальна
 * точка await у resolveChallenge, до бounds-перевалідації вже пройденої)
 * прогрес переможеного стискається з 12 до 3, а resolveChallenge все одно
 * мусить списати рівно 3, а не 12 і не впасти в неузгодженість.
 */
describe('duel resolution under a concurrent /metr race (phase 4.2/4.6)', () => {
  it('clamps the loser at the boundary and reports the real applied amount', async () => {
    vi.spyOn(duelCoin, 'challengerWinsCoinFlip').mockReturnValue(true);
    vi.spyOn(questService, 'registerDuelWin').mockImplementation(async () => {
      // Симуляція паралельного /metr, що приземлився саме в цьому вікні -
      // до getStakeBounds-перевалідації (яка вже пройшла раніше) стискає прогрес.
      await UserModel.updateOne({ telegram_id: 2 }, { $set: { value: 3 } });
      return null;
    });

    await UserModel.create({ telegram_id: 1, first_name: 'Challenger', value: 100, mode: 'grow' });
    await UserModel.create({ telegram_id: 2, first_name: 'Target', value: 12, mode: 'grow' });

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const challenge = await DuelChallengeModel.create({
      chat_id: 1,
      challenger_telegram_id: 1,
      target_telegram_id: 2,
      status: 'pending',
      stake: 12,
      expires_at: expiresAt,
      cleanup_at: new Date(expiresAt.getTime() + 7 * 24 * 60 * 60 * 1000),
    });

    const result = await resolveChallenge(challenge._id.toString(), 2);

    expect(result.winnerTelegramId).toBe(1);
    expect(result.loserTelegramId).toBe(2);
    expect(result.amount).toBe(12);
    expect(result.stakeReduced).toBe(false);
    expect(result.loserApplied).toBe(3);

    const [winnerAfter, loserAfter] = await Promise.all([
      UserModel.findOne({ telegram_id: 1 }),
      UserModel.findOne({ telegram_id: 2 }),
    ]);
    expect(result.winnerValue).toBe(winnerAfter?.value);
    expect(result.loserValue).toBe(loserAfter?.value);
    expect(loserAfter?.value).toBe(0);
  });
});
