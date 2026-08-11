import { describe, expect, it } from 'vitest';
import { UserModel } from '../../src/database/models/user.model';
import { buildClampedValueUpdate } from '../../src/utils/value-update.util';

/**
 * buildClampedValueUpdate - update з aggregation pipeline (Mongo 4.2+) - не
 * можна перевірити формою самого запиту (unit-тест на це вже є), треба
 * реально прогнати проти Mongo, інакше не помітиш помилку синтаксису виразу.
 */
describe('buildClampedValueUpdate against real Mongo (4.2)', () => {
  it('grow at 2 cm hitting a -10 delta clamps to 0, growth falls by only 2 (not 10)', async () => {
    const user = await UserModel.create({
      telegram_id: 1,
      first_name: 'Grower',
      value: 2,
      mode: 'grow',
      season_growth: 20,
      round_growth: 20,
    });

    const updated = await UserModel.findOneAndUpdate(
      { _id: user._id },
      buildClampedValueUpdate(-10, 'grow'),
      { new: true },
    );

    expect(updated?.value).toBe(0);
    expect(updated?.season_growth).toBe(18);
    expect(updated?.round_growth).toBe(18);
  });

  it('drill at -2 cm hitting a +10 delta clamps to 0, growth changes by only 2 (not 10)', async () => {
    const user = await UserModel.create({
      telegram_id: 1,
      first_name: 'Driller',
      value: -2,
      mode: 'drill',
      season_growth: -20,
      round_growth: -20,
    });

    const updated = await UserModel.findOneAndUpdate(
      { _id: user._id },
      buildClampedValueUpdate(10, 'drill'),
      { new: true },
    );

    expect(updated?.value).toBe(0);
    expect(updated?.season_growth).toBe(-18);
    expect(updated?.round_growth).toBe(-18);
  });

  it('round_best_delta is not corrupted by a later clamped hit', async () => {
    const user = await UserModel.create({ telegram_id: 1, first_name: 'Grower', value: 0, mode: 'grow' });

    const afterBigHit = await UserModel.findOneAndUpdate(
      { _id: user._id },
      buildClampedValueUpdate(5, 'grow'),
      { new: true },
    );
    expect(afterBigHit?.round_best_delta).toBe(5);

    // Clamped down to 0 again - applied delta is -5, progress is -5, must not overwrite the record of 5.
    const afterClampedHit = await UserModel.findOneAndUpdate(
      { _id: user._id },
      buildClampedValueUpdate(-10, 'grow'),
      { new: true },
    );
    expect(afterClampedHit?.value).toBe(0);
    expect(afterClampedHit?.round_best_delta).toBe(5);
  });

  it('chats does not duplicate an already-present chatId ($setUnion replaces $addToSet)', async () => {
    const user = await UserModel.create({ telegram_id: 1, first_name: 'Grower', value: 0, chats: [7] });

    const updated = await UserModel.findOneAndUpdate(
      { _id: user._id },
      buildClampedValueUpdate(1, 'grow', { chats: { $setUnion: ['$chats', [7]] } }),
      { new: true },
    );

    expect(updated?.chats).toEqual([7]);
  });
});
