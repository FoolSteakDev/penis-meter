import type { Context } from 'telegraf';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./metr.command', () => ({ handleMetrCommand: vi.fn().mockResolvedValue(undefined) }));
vi.mock('./status.command', () => ({ handleStatusCommand: vi.fn().mockResolvedValue(undefined) }));
vi.mock('./rating.command', () => ({ handleRatingCommand: vi.fn().mockResolvedValue(undefined) }));
vi.mock('./global-rating.command', () => ({ handleGlobalRatingCommand: vi.fn().mockResolvedValue(undefined) }));
vi.mock('./season.command', () => ({ handleSeasonCommand: vi.fn().mockResolvedValue(undefined) }));
vi.mock('./round.command', () => ({ handleRoundCommand: vi.fn().mockResolvedValue(undefined) }));
vi.mock('./duel.command', () => ({ handleDuelCommand: vi.fn().mockResolvedValue(undefined) }));
vi.mock('./duel-history.command', () => ({
  handleDuelHistoryCommand: vi.fn().mockResolvedValue(undefined),
  handleDuelHistoryMeAction: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('./season-history.command', () => ({ handleSeasonHistoryCommand: vi.fn().mockResolvedValue(undefined) }));
vi.mock('./admin.command', () => ({ handleAdminCommand: vi.fn().mockResolvedValue(undefined) }));

import { handleAdminCommand } from './admin.command';
import { handleMetrCommand } from './metr.command';
import { handleMenuAction } from './menu.command';

function fakeCtx(data: string) {
  return {
    callbackQuery: { data },
    answerCbQuery: vi.fn().mockResolvedValue(undefined),
    reply: vi.fn().mockResolvedValue(undefined),
  } as unknown as Context;
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('handleMenuAction', () => {
  it('dispatches m:metr to handleMetrCommand', async () => {
    const ctx = fakeCtx('m:metr');
    await handleMenuAction(ctx);
    expect(handleMetrCommand).toHaveBeenCalledWith(ctx);
    expect(ctx.answerCbQuery).toHaveBeenCalledTimes(1);
  });

  it('dispatches m:admin to handleAdminCommand', async () => {
    const ctx = fakeCtx('m:admin');
    await handleMenuAction(ctx);
    expect(handleAdminCommand).toHaveBeenCalledWith(ctx);
  });

  it('silently exits for an unknown key without calling any handler', async () => {
    const ctx = fakeCtx('m:zzz');
    await handleMenuAction(ctx);
    expect(handleMetrCommand).not.toHaveBeenCalled();
    expect(ctx.answerCbQuery).toHaveBeenCalledTimes(1);
    expect(ctx.reply).not.toHaveBeenCalled();
  });

  it('answers the callback query even when the dispatched handler throws', async () => {
    vi.mocked(handleMetrCommand).mockRejectedValueOnce(new Error('boom'));
    const ctx = fakeCtx('m:metr');

    await expect(handleMenuAction(ctx)).rejects.toThrow('boom');

    expect(ctx.answerCbQuery).toHaveBeenCalledTimes(1);
  });
});
