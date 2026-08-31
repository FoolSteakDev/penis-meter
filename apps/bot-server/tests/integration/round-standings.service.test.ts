import { describe, expect, it } from 'vitest';
import { RoundChatSnapshotModel } from '../../src/database/models/round-chat-snapshot.model';
import { UserModel } from '../../src/database/models/user.model';
import { collectRoundStandings } from '../../src/services/round-standings.service';

const CHAT_ID = 555;
const ROUND_NUMBER = 3;

async function makeUser(telegramId: number, value: number, chats: number[] = [CHAT_ID]) {
  return UserModel.create({ telegram_id: telegramId, first_name: `U${telegramId}`, value, chats });
}

describe('collectRoundStandings', () => {
  it('reports the current top-3 per chat', async () => {
    const users = await Promise.all([makeUser(1, 30), makeUser(2, 20), makeUser(3, 10), makeUser(4, 5)]);

    const { top3ByChat } = await collectRoundStandings(users, [CHAT_ID], ROUND_NUMBER);

    expect(top3ByChat.get(CHAT_ID)).toEqual([1, 2, 3]);
  });

  it('flags players who entered the top-3 since the round-start snapshot', async () => {
    const users = await Promise.all([makeUser(1, 30), makeUser(2, 20), makeUser(3, 10)]);
    await RoundChatSnapshotModel.create({
      round_number: ROUND_NUMBER,
      chat_id: CHAT_ID,
      top3_telegram_ids: [1, 2, 99],
    });

    const { climbers } = await collectRoundStandings(users, [CHAT_ID], ROUND_NUMBER);

    expect(climbers).toEqual([{ chatId: CHAT_ID, telegramId: 3 }]);
  });

  it('skips climbers for a chat with no round-start snapshot, without throwing', async () => {
    const users = await Promise.all([makeUser(1, 30)]);

    const { top3ByChat, climbers } = await collectRoundStandings(users, [CHAT_ID], ROUND_NUMBER);

    expect(climbers).toEqual([]);
    expect(top3ByChat.get(CHAT_ID)).toEqual([1]);
  });
});
