import type { Context } from 'telegraf';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AchievementSettingsModel } from '../../src/database/models/achievement-settings.model';
import { UserModel } from '../../src/database/models/user.model';
import { handleModeSwitchConfirmAction } from '../../src/bot/commands/mode.command';

function fakeCtx(telegramId: number, data: string) {
  return {
    from: { id: telegramId, username: null, first_name: 'Test' },
    callbackQuery: { data },
    answerCbQuery: vi.fn().mockResolvedValue(undefined),
    editMessageText: vi.fn().mockResolvedValue(undefined),
    reply: vi.fn().mockResolvedValue(undefined),
  } as unknown as Context & {
    answerCbQuery: ReturnType<typeof vi.fn>;
    editMessageText: ReturnType<typeof vi.fn>;
    reply: ReturnType<typeof vi.fn>;
  };
}

// Цей файл перевіряє лише напрямок віднімання при "спалюванні" (4.3.3) - вимикаємо
// систему досягнень, щоб нагорода за 'twoface' не спотворювала точні очікування нижче.
beforeEach(async () => {
  await AchievementSettingsModel.create({ is_enabled: false });
});

/**
 * 4.3.3: при обнуленні (незбіжний знак) growth-поля мають ВІДНІМАТИ |value|,
 * а НЕ додавати -value - інакше буровик, що тікає в grow з від'ємного value,
 * отримав би +|value| до приросту як нагороду за спалення. Головний кейс,
 * заради якого написано 4.3.3 - тому окремий файл, а не лише кейс у
 * mode.command.test.ts.
 */
describe('mode switch burn - subtraction direction (phase 4.3.3)', () => {
  it('grow(+50) -> drill: value becomes 0, season/round growth both DECREASE by 50', async () => {
    await UserModel.create({
      telegram_id: 1,
      first_name: 'Test',
      value: 50,
      mode: 'grow',
      season_growth: 80,
      round_growth: 60,
    });
    const ctx = fakeCtx(1, 'mode:go:drill');

    await handleModeSwitchConfirmAction(ctx);

    const user = await UserModel.findOne({ telegram_id: 1 });
    expect(user?.mode).toBe('drill');
    expect(user?.value).toBe(0);
    expect(user?.season_growth).toBe(30);
    expect(user?.round_growth).toBe(10);
  });

  it('drill(-50) -> grow: value becomes 0, season/round growth both DECREASE by 50 (not increase)', async () => {
    await UserModel.create({
      telegram_id: 1,
      first_name: 'Test',
      value: -50,
      mode: 'drill',
      season_growth: -80,
      round_growth: -60,
    });
    const ctx = fakeCtx(1, 'mode:go:grow');

    await handleModeSwitchConfirmAction(ctx);

    const user = await UserModel.findOne({ telegram_id: 1 });
    expect(user?.mode).toBe('grow');
    expect(user?.value).toBe(0);
    expect(user?.season_growth).toBe(-130);
    expect(user?.round_growth).toBe(-110);
  });
});
