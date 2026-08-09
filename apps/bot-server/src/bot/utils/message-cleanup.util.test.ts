import type { Telegram } from 'telegraf';
import { describe, expect, it, vi } from 'vitest';
import { safeDeleteMessages } from './message-cleanup.util';

function fakeTelegram(deleteMessages = vi.fn().mockResolvedValue(true)) {
  return { deleteMessages } as unknown as Telegram;
}

describe('safeDeleteMessages', () => {
  it('filters out null/undefined ids before calling deleteMessages', async () => {
    const telegram = fakeTelegram();
    await safeDeleteMessages(telegram, 1, [10, null, undefined, 20]);
    expect(telegram.deleteMessages).toHaveBeenCalledWith(1, [10, 20]);
  });

  it('does not call deleteMessages when no valid ids remain', async () => {
    const telegram = fakeTelegram();
    await safeDeleteMessages(telegram, 1, [null, undefined]);
    expect(telegram.deleteMessages).not.toHaveBeenCalled();
  });

  it('swallows errors from a failed Telegram call', async () => {
    const telegram = fakeTelegram(vi.fn().mockRejectedValue(new Error('no can_delete_messages')));
    await expect(safeDeleteMessages(telegram, 1, [10])).resolves.toBeUndefined();
  });
});
