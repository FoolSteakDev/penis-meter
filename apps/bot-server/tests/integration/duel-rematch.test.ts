import { describe, expect, it } from 'vitest';
import { DuelChallengeModel } from '../../src/database/models/duel-challenge.model';
import { DuelSettingsModel } from '../../src/database/models/duel-settings.model';
import { UserModel } from '../../src/database/models/user.model';
import {
  createDraftChallenge,
  createRematchChallenge,
  declineChallenge,
  finalizeChallenge,
  getStakeBounds,
  resolveChallenge,
} from '../../src/services/duel.service';

const CHAT_ID = 1;

async function playBaseDuel(stake = 5, challengerValue = 50, targetValue = 50) {
  await UserModel.create({ telegram_id: 1, first_name: 'Challenger', value: challengerValue, chats: [CHAT_ID] });
  await UserModel.create({ telegram_id: 2, first_name: 'Target', value: targetValue, chats: [CHAT_ID] });

  const draft = await createDraftChallenge(CHAT_ID, 1, 2);
  const finalized = await finalizeChallenge(draft.id, 1, stake);
  const result = await resolveChallenge(finalized.id, 2);
  return { finalized, result };
}

describe('createRematchChallenge (phase 5.2)', () => {
  it('happy path: rematch mirrors the resolved stake with reversed roles', async () => {
    const { finalized, result } = await playBaseDuel();

    const rematch = await createRematchChallenge(finalized.id, 2);

    expect(rematch.challenge.status).toBe('pending');
    expect(rematch.challenge.stake).toBe(result.amount);
    expect(rematch.challenge.challenger_telegram_id).toBe(2);
    expect(rematch.challenge.target_telegram_id).toBe(1);
    expect(rematch.challenge.rematch_of?.toString()).toBe(finalized.id);
    expect(rematch.stakeReduced).toBe(false);
  });

  it('reduces the stake to the ceiling when a participant no longer has enough', async () => {
    const { finalized } = await playBaseDuel(5);

    await UserModel.updateOne({ telegram_id: 1 }, { $set: { value: 3 } });
    const bounds = await getStakeBounds(2, 1);

    const rematch = await createRematchChallenge(finalized.id, 2);

    expect(rematch.stakeReduced).toBe(true);
    expect(rematch.challenge.stake).toBe(bounds.max);
  });

  it('rejects when a participant has 0 cm to risk', async () => {
    const { finalized } = await playBaseDuel(5);

    await UserModel.updateOne({ telegram_id: 1 }, { $set: { value: 0 } });

    await expect(createRematchChallenge(finalized.id, 2)).rejects.toThrow(/нема чим ризикувати/);
  });

  it('rejects a third party who is not a participant of the source duel', async () => {
    const { finalized } = await playBaseDuel();

    await expect(createRematchChallenge(finalized.id, 999)).rejects.toThrow(/не для тебе/);
  });

  it('allows at most one unconfirmed rematch per source duel', async () => {
    const { finalized } = await playBaseDuel();

    await createRematchChallenge(finalized.id, 2);

    await expect(createRematchChallenge(finalized.id, 2)).rejects.toThrow(
      /вже є активний виклик|Реванш уже запущено/,
    );
  });

  it('allows a new rematch after the previous one was declined', async () => {
    const { finalized } = await playBaseDuel();

    const first = await createRematchChallenge(finalized.id, 2);
    await declineChallenge(first.challenge.id, 1);

    const second = await createRematchChallenge(finalized.id, 2);
    expect(second.challenge.status).toBe('pending');
  });

  it('rejects a rematch off a source that never reached accepted', async () => {
    await UserModel.create({ telegram_id: 1, first_name: 'Challenger', value: 50, chats: [CHAT_ID] });
    await UserModel.create({ telegram_id: 2, first_name: 'Target', value: 50, chats: [CHAT_ID] });
    const draft = await createDraftChallenge(CHAT_ID, 1, 2);
    const finalized = await finalizeChallenge(draft.id, 1, 5);

    await expect(createRematchChallenge(finalized.id, 2)).rejects.toThrow(/застара|неактуальн/);
  });

  it('rejects when the initiator already has max_pending_challenges pending', async () => {
    const { finalized } = await playBaseDuel();

    for (let i = 3; i <= 7; i += 1) {
      await UserModel.create({ telegram_id: i, first_name: `Other${i}`, value: 50, chats: [CHAT_ID] });
      const otherDraft = await createDraftChallenge(CHAT_ID, 2, i);
      await finalizeChallenge(otherDraft.id, 2, 5);
    }

    await expect(createRematchChallenge(finalized.id, 2)).rejects.toThrow(/активних викликів/);
  });

  it('rejects a rematch while duels are disabled', async () => {
    const { finalized } = await playBaseDuel();

    await DuelSettingsModel.updateOne({}, { $set: { is_enabled: false } });

    await expect(createRematchChallenge(finalized.id, 2)).rejects.toThrow(/вимкнено адміністратором/);
  });

  it('persists resolved_stake on the source challenge after resolveChallenge', async () => {
    const { finalized, result } = await playBaseDuel();

    const stored = await DuelChallengeModel.findById(finalized.id);
    expect(stored?.resolved_stake).toBe(result.amount);
  });
});
