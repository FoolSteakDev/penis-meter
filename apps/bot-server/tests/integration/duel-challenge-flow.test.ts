import { describe, expect, it } from 'vitest';
import { UserModel } from '../../src/database/models/user.model';
import { createDraftChallenge, finalizeChallenge } from '../../src/services/duel.service';

describe('finalizeChallenge - limits (phase 3.1/3.2)', () => {
  it('rejects the 6th concurrent pending challenge from the same challenger (default limit 5)', async () => {
    await UserModel.create({ telegram_id: 1, first_name: 'Challenger', value: 50, chats: [100] });
    for (let i = 2; i <= 7; i += 1) {
      await UserModel.create({ telegram_id: i, first_name: `Target${i}`, value: 50, chats: [100] });
    }

    for (let i = 2; i <= 6; i += 1) {
      const draft = await createDraftChallenge(100, 1, i);
      await finalizeChallenge(draft.id, 1, 5);
    }

    const sixthDraft = await createDraftChallenge(100, 1, 7);
    await expect(finalizeChallenge(sixthDraft.id, 1, 5)).rejects.toThrow(/активних викликів/);
  });

  it('rejects a duplicate challenge against the same target', async () => {
    await UserModel.create({ telegram_id: 10, first_name: 'Challenger', value: 50, chats: [200] });
    await UserModel.create({ telegram_id: 20, first_name: 'Target', value: 50, chats: [200] });

    const first = await createDraftChallenge(200, 10, 20);
    await finalizeChallenge(first.id, 10, 5);

    const second = await createDraftChallenge(200, 10, 20);
    await expect(finalizeChallenge(second.id, 10, 5)).rejects.toThrow(/вже викликав/);
  });
});
