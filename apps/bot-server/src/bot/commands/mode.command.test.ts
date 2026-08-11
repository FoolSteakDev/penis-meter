import type { Context } from 'telegraf';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UserModel } from '../../database/models/user.model';
import { handleModeSwitchAction } from './mode.command';

function fakeCtx(telegramId: number, data: string) {
  return {
    from: { id: telegramId, username: null, first_name: 'Test' },
    callbackQuery: { data },
    answerCbQuery: vi.fn().mockResolvedValue(undefined),
    editMessageText: vi.fn().mockResolvedValue(undefined),
  } as unknown as Context & { answerCbQuery: ReturnType<typeof vi.fn>; editMessageText: ReturnType<typeof vi.fn> };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('handleModeSwitchAction', () => {
  it('answers "already in this mode" and does not edit the message when target === current mode', async () => {
    await UserModel.create({ telegram_id: 1, first_name: 'Test', value: 10, mode: 'grow' });
    const ctx = fakeCtx(1, 'mode:grow');

    await handleModeSwitchAction(ctx);

    expect(ctx.answerCbQuery).toHaveBeenCalledWith('Ти вже в цьому режимі');
    expect(ctx.editMessageText).not.toHaveBeenCalled();
  });

  it('shows a cooldown alert when MODE_SWITCH_COOLDOWN_HOURS has not elapsed', async () => {
    await UserModel.create({
      telegram_id: 1,
      first_name: 'Test',
      value: 10,
      mode: 'grow',
      mode_changed_at: new Date(),
    });
    const ctx = fakeCtx(1, 'mode:drill');

    await handleModeSwitchAction(ctx);

    expect(ctx.answerCbQuery).toHaveBeenCalledTimes(1);
    const [message, options] = ctx.answerCbQuery.mock.calls[0];
    expect(message).toMatch(/Перемкнути режим можна через/);
    expect(options).toEqual({ show_alert: true });
    expect(ctx.editMessageText).not.toHaveBeenCalled();

    const user = await UserModel.findOne({ telegram_id: 1 });
    expect(user?.mode).toBe('grow');
  });

  it('switches mode, persists mode_changed_at, and redraws the status view on success', async () => {
    await UserModel.create({ telegram_id: 1, first_name: 'Test', value: 10, mode: 'grow' });
    const ctx = fakeCtx(1, 'mode:drill');

    await handleModeSwitchAction(ctx);

    expect(ctx.editMessageText).toHaveBeenCalledTimes(1);
    expect(ctx.answerCbQuery).toHaveBeenCalledWith();

    const user = await UserModel.findOne({ telegram_id: 1 });
    expect(user?.mode).toBe('drill');
    expect(user?.mode_changed_at).not.toBeNull();
  });

  it('answers with an error alert when the CAS update loses a race (findOneAndUpdate returns null)', async () => {
    await UserModel.create({ telegram_id: 1, first_name: 'Test', value: 10, mode: 'grow' });
    vi.spyOn(UserModel, 'findOneAndUpdate').mockResolvedValueOnce(null);
    const ctx = fakeCtx(1, 'mode:drill');

    await handleModeSwitchAction(ctx);

    expect(ctx.answerCbQuery).toHaveBeenCalledWith('Не вдалось перемкнути режим - спробуй ще раз', {
      show_alert: true,
    });
    expect(ctx.editMessageText).not.toHaveBeenCalled();
  });

  it('ignores callback data that does not match mode:(grow|drill)', async () => {
    const ctx = fakeCtx(1, 'mode:unknown');

    await handleModeSwitchAction(ctx);

    expect(ctx.answerCbQuery).not.toHaveBeenCalled();
  });
});
