import { describe, expect, it } from 'vitest';
import { DuelChallengeModel } from '../../src/database/models/duel-challenge.model';
import { DuelHistoryModel } from '../../src/database/models/duel-history.model';
import { UserModel } from '../../src/database/models/user.model';
import { resolveChallenge } from '../../src/services/duel.service';

describe('resolveChallenge - concurrency (phase 1.3)', () => {
  it('2 parallel resolves for the same challenge produce exactly one DuelHistory entry', async () => {
    await UserModel.create({ telegram_id: 1, first_name: 'Challenger', value: 10 });
    await UserModel.create({ telegram_id: 2, first_name: 'Target', value: 10 });

    const challenge = await DuelChallengeModel.create({
      chat_id: 100,
      challenger_telegram_id: 1,
      target_telegram_id: 2,
      status: 'pending',
      expires_at: new Date(Date.now() + 10 * 60 * 1000),
    });

    const results = await Promise.allSettled([
      resolveChallenge(challenge._id.toString(), 2),
      resolveChallenge(challenge._id.toString(), 2),
    ]);

    const succeeded = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected');
    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect((failed[0] as PromiseRejectedResult).reason).toBeInstanceOf(Error);

    const historyCount = await DuelHistoryModel.countDocuments({ chat_id: 100 });
    expect(historyCount).toBe(1);

    const [challengerAfter, targetAfter] = await Promise.all([
      UserModel.findOne({ telegram_id: 1 }),
      UserModel.findOne({ telegram_id: 2 }),
    ]);
    // Без активного квесту переможець отримує +amount, програвший -amount -
    // сумарне value обох учасників не змінюється.
    const sumAfter = (challengerAfter?.value ?? 0) + (targetAfter?.value ?? 0);
    expect(sumAfter).toBe(20);
  });
});
