import { describe, expect, it } from 'vitest';
import { UserModel } from '../../src/database/models/user.model';
import { getChatRating, getGlobalRating } from '../../src/services/user.service';

describe('abs-rating (phase 3.5)', () => {
  it('ranks -500 (drill) next to +500 (grow), both above +10', async () => {
    await UserModel.create({ telegram_id: 1, first_name: 'Drill500', value: -500, mode: 'drill', chats: [1] });
    await UserModel.create({ telegram_id: 2, first_name: 'Grow500', value: 500, mode: 'grow', chats: [1] });
    await UserModel.create({ telegram_id: 3, first_name: 'Grow10', value: 10, mode: 'grow', chats: [1] });

    const chatRating = await getChatRating(1);
    expect(chatRating.map((u) => u.telegramId)).toEqual([1, 2, 3]);

    const globalRating = await getGlobalRating();
    expect(globalRating.map((u) => u.telegramId)).toEqual([1, 2, 3]);
  });
});
