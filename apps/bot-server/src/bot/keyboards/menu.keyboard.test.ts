import type { Context } from 'telegraf';
import { describe, expect, it, vi } from 'vitest';
import { MENU_HANDLERS } from '../commands/menu.command';
import { buildInlineMenu, buildStickyMenuRow, MENU_ITEMS, replyWithMenu } from './menu.keyboard';

describe('buildInlineMenu', () => {
  it('contains exactly 11 buttons', () => {
    const markup = buildInlineMenu();
    const total = markup.reply_markup.inline_keyboard.reduce((sum, row) => sum + row.length, 0);
    expect(total).toBe(11);
  });

  it('keeps every callback_data within the 64-byte Telegram limit', () => {
    const markup = buildInlineMenu();
    for (const row of markup.reply_markup.inline_keyboard) {
      for (const button of row) {
        expect('callback_data' in button && Buffer.byteLength(button.callback_data, 'utf8')).toBeLessThanOrEqual(64);
      }
    }
  });

  it('has a MENU_HANDLERS entry for every MENU_ITEMS key and vice versa', () => {
    const itemKeys = MENU_ITEMS.flat().map((item) => item.key).sort();
    const handlerKeys = Object.keys(MENU_HANDLERS).sort();
    expect(itemKeys).toEqual(handlerKeys);
  });
});

describe('buildStickyMenuRow', () => {
  it('is a single compact row with the open-menu button', () => {
    const markup = buildStickyMenuRow();
    expect(markup.reply_markup.inline_keyboard).toHaveLength(1);
    const callbackData = markup.reply_markup.inline_keyboard[0].map((button) =>
      'callback_data' in button ? button.callback_data : null,
    );
    expect(callbackData).toEqual(['m:metr', 'm:status', 'm:open']);
  });
});

describe('replyWithMenu', () => {
  it('prepends the actor label before the sticky row in a group chat', async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = { chat: { type: 'group' }, from: { first_name: 'Petro' }, reply } as unknown as Context;

    await replyWithMenu(ctx, 'hello');

    expect(reply).toHaveBeenCalledTimes(1);
    const [text] = reply.mock.calls[0];
    expect(text).toMatch(/^👤 Petro\n/);
  });
});
