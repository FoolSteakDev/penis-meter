import type { Telegraf } from 'telegraf';
import { describe, expect, it, vi } from 'vitest';
import { DuelChallengeModel } from '../../src/database/models/duel-challenge.model';
import { sweepExpiredChallenges } from '../../src/services/duel.service';

function fakeBot() {
  return { telegram: { editMessageText: vi.fn().mockResolvedValue(undefined) } } as unknown as Telegraf;
}

describe('sweepExpiredChallenges (phase 3.4)', () => {
  it('expires an overdue pending challenge and edits its invite message', async () => {
    const bot = fakeBot();
    const pastExpiry = new Date(Date.now() - 60 * 1000);
    const challenge = await DuelChallengeModel.create({
      chat_id: 1,
      challenger_telegram_id: 1,
      target_telegram_id: 2,
      status: 'pending',
      stake: 5,
      invite_chat_id: 1,
      invite_message_id: 999,
      expires_at: pastExpiry,
      cleanup_at: new Date(pastExpiry.getTime() + 7 * 24 * 60 * 60 * 1000),
    });

    await sweepExpiredChallenges(bot);

    const updated = await DuelChallengeModel.findById(challenge._id);
    expect(updated?.status).toBe('expired');
    expect(bot.telegram.editMessageText).toHaveBeenCalledWith(1, 999, undefined, '⌛ Виклик протерміновано.');
  });

  it('leaves non-expired pending challenges untouched', async () => {
    const bot = fakeBot();
    const futureExpiry = new Date(Date.now() + 60 * 60 * 1000);
    const challenge = await DuelChallengeModel.create({
      chat_id: 1,
      challenger_telegram_id: 1,
      target_telegram_id: 2,
      status: 'pending',
      stake: 5,
      invite_chat_id: 1,
      invite_message_id: 998,
      expires_at: futureExpiry,
      cleanup_at: new Date(futureExpiry.getTime() + 7 * 24 * 60 * 60 * 1000),
    });

    await sweepExpiredChallenges(bot);

    const untouched = await DuelChallengeModel.findById(challenge._id);
    expect(untouched?.status).toBe('pending');
    expect(bot.telegram.editMessageText).not.toHaveBeenCalled();
  });

  it('deletes drafts abandoned past DUEL_DRAFT_TTL_MINUTES', async () => {
    const bot = fakeBot();
    const draft = await DuelChallengeModel.create({
      chat_id: 1,
      challenger_telegram_id: 1,
      target_telegram_id: 2,
      status: 'draft',
      stake: null,
      expires_at: new Date(Date.now() + 60 * 1000),
      cleanup_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    // Форсуємо created_at у минуле через "сирий" driver, не Model.updateOne -
    // Mongoose-хук timestamps:true інакше тихо ігнорує $set по created_at.
    await DuelChallengeModel.collection.updateOne(
      { _id: draft._id },
      { $set: { created_at: new Date(Date.now() - 11 * 60 * 1000) } },
    );

    await sweepExpiredChallenges(bot);

    expect(await DuelChallengeModel.findById(draft._id)).toBeNull();
  });

  it('leaves recent drafts alone', async () => {
    const bot = fakeBot();
    const draft = await DuelChallengeModel.create({
      chat_id: 1,
      challenger_telegram_id: 1,
      target_telegram_id: 2,
      status: 'draft',
      stake: null,
      expires_at: new Date(Date.now() + 60 * 1000),
      cleanup_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    await sweepExpiredChallenges(bot);

    expect(await DuelChallengeModel.findById(draft._id)).not.toBeNull();
  });
});
