import type { Context } from 'telegraf';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UserModel } from '../../database/models/user.model';
import {
  handleModeCancelAction,
  handleModeSwitchConfirmAction,
  handleModeSwitchPromptAction,
} from './mode.command';

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

describe('handleModeSwitchPromptAction (mode:<target> - step 1, no DB writes)', () => {
  it('answers "already in this mode" and does not edit the message when target === current mode', async () => {
    await UserModel.create({ telegram_id: 1, first_name: 'Test', value: 10, mode: 'grow' });
    const ctx = fakeCtx(1, 'mode:grow');

    await handleModeSwitchPromptAction(ctx);

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

    await handleModeSwitchPromptAction(ctx);

    expect(ctx.answerCbQuery).toHaveBeenCalledTimes(1);
    const [message, options] = ctx.answerCbQuery.mock.calls[0];
    expect(message).toMatch(/Перемкнути режим можна через/);
    expect(options).toEqual({ show_alert: true });
    expect(ctx.editMessageText).not.toHaveBeenCalled();
  });

  it('does not write to the DB - only draws a confirmation screen', async () => {
    await UserModel.create({ telegram_id: 1, first_name: 'Test', value: 10, mode: 'grow' });
    const ctx = fakeCtx(1, 'mode:drill');

    await handleModeSwitchPromptAction(ctx);

    expect(ctx.editMessageText).toHaveBeenCalledTimes(1);
    expect(ctx.answerCbQuery).toHaveBeenCalledWith();

    const user = await UserModel.findOne({ telegram_id: 1 });
    expect(user?.mode).toBe('grow');
    expect(user?.mode_changed_at).toBeNull();
  });

  it('shows the burn warning with the exact amount when the sign would mismatch', async () => {
    await UserModel.create({ telegram_id: 1, first_name: 'Test', value: 148.5, mode: 'grow' });
    const ctx = fakeCtx(1, 'mode:drill');

    await handleModeSwitchPromptAction(ctx);

    const [text] = ctx.editMessageText.mock.calls[0];
    expect(text).toMatch(/ОБНУЛИТЬ/);
    expect(text).toMatch(/148\.5 см ЗГОРЯТЬ ДОЩЕНТУ/);
  });

  it('shows the short screen (no burn warning) when the sign already matches', async () => {
    await UserModel.create({ telegram_id: 1, first_name: 'Test', value: 0, mode: 'grow' });
    const ctx = fakeCtx(1, 'mode:drill');

    await handleModeSwitchPromptAction(ctx);

    const [text] = ctx.editMessageText.mock.calls[0];
    expect(text).not.toMatch(/ОБНУЛИТЬ/);
    expect(text).toMatch(/лишаються без змін/);
  });

  it('ignores callback data that does not match mode:(grow|drill)', async () => {
    const ctx = fakeCtx(1, 'mode:unknown');

    await handleModeSwitchPromptAction(ctx);

    expect(ctx.answerCbQuery).not.toHaveBeenCalled();
  });

  it('does not match mode:go:<target> callback data (regex anchor regression)', async () => {
    const ctx = fakeCtx(1, 'mode:go:drill');

    await handleModeSwitchPromptAction(ctx);

    expect(ctx.answerCbQuery).not.toHaveBeenCalled();
    expect(ctx.editMessageText).not.toHaveBeenCalled();
  });
});

describe('handleModeSwitchConfirmAction (mode:go:<target> - step 2, actual switch)', () => {
  it('switches mode without burning when the sign already matches', async () => {
    await UserModel.create({ telegram_id: 1, first_name: 'Test', value: 0, mode: 'grow' });
    const ctx = fakeCtx(1, 'mode:go:drill');

    await handleModeSwitchConfirmAction(ctx);

    expect(ctx.editMessageText).toHaveBeenCalledTimes(1);
    const [text] = ctx.editMessageText.mock.calls[0];
    expect(text).not.toMatch(/Згоріло/);
    expect(ctx.answerCbQuery).toHaveBeenCalledWith();

    const user = await UserModel.findOne({ telegram_id: 1 });
    expect(user?.mode).toBe('drill');
    expect(user?.value).toBe(0);
    expect(user?.mode_changed_at).not.toBeNull();
  });

  it('burns value to 0 and subtracts it from season/round growth when the sign mismatches', async () => {
    await UserModel.create({
      telegram_id: 1,
      first_name: 'Test',
      value: 148.5,
      mode: 'grow',
      season_growth: 200,
      round_growth: 150,
    });
    const ctx = fakeCtx(1, 'mode:go:drill');

    await handleModeSwitchConfirmAction(ctx);

    const [text] = ctx.editMessageText.mock.calls[0];
    expect(text).toMatch(/🔥 Згоріло: 148\.5 см/);

    const user = await UserModel.findOne({ telegram_id: 1 });
    expect(user?.mode).toBe('drill');
    expect(user?.value).toBe(0);
    expect(user?.season_growth).toBe(200 - 148.5);
    expect(user?.round_growth).toBe(150 - 148.5);
  });

  it('shows a cooldown alert when MODE_SWITCH_COOLDOWN_HOURS has not elapsed (rechecked on step 2)', async () => {
    await UserModel.create({
      telegram_id: 1,
      first_name: 'Test',
      value: 10,
      mode: 'grow',
      mode_changed_at: new Date(),
    });
    const ctx = fakeCtx(1, 'mode:go:drill');

    await handleModeSwitchConfirmAction(ctx);

    expect(ctx.answerCbQuery).toHaveBeenCalledTimes(1);
    const [message, options] = ctx.answerCbQuery.mock.calls[0];
    expect(message).toMatch(/Перемкнути режим можна через/);
    expect(options).toEqual({ show_alert: true });
    expect(ctx.editMessageText).not.toHaveBeenCalled();

    const user = await UserModel.findOne({ telegram_id: 1 });
    expect(user?.mode).toBe('grow');
  });

  it('answers with an error alert when the CAS update loses a race (value changed between screen and tap)', async () => {
    await UserModel.create({ telegram_id: 1, first_name: 'Test', value: 10, mode: 'grow' });
    vi.spyOn(UserModel, 'findOneAndUpdate').mockResolvedValueOnce(null);
    const ctx = fakeCtx(1, 'mode:go:drill');

    await handleModeSwitchConfirmAction(ctx);

    expect(ctx.answerCbQuery).toHaveBeenCalledWith(
      'Твоє значення щойно змінилось - відкрий /status і спробуй ще раз',
      { show_alert: true },
    );
    expect(ctx.editMessageText).not.toHaveBeenCalled();
  });

  it('ignores callback data that does not match mode:go:(grow|drill)', async () => {
    const ctx = fakeCtx(1, 'mode:drill');

    await handleModeSwitchConfirmAction(ctx);

    expect(ctx.answerCbQuery).not.toHaveBeenCalled();
  });
});

describe('handleModeCancelAction (mode:cancel)', () => {
  it('redraws the normal status view without changing anything', async () => {
    await UserModel.create({ telegram_id: 1, first_name: 'Test', value: 10, mode: 'grow' });
    const ctx = fakeCtx(1, 'mode:cancel');

    await handleModeCancelAction(ctx);

    expect(ctx.editMessageText).toHaveBeenCalledTimes(1);
    expect(ctx.answerCbQuery).toHaveBeenCalledWith();

    const user = await UserModel.findOne({ telegram_id: 1 });
    expect(user?.mode).toBe('grow');
    expect(user?.mode_changed_at).toBeNull();
  });
});
