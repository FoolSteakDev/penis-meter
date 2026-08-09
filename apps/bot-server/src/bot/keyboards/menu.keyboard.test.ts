import { describe, expect, it } from 'vitest';
import { MENU_HANDLERS } from '../commands/menu.command';
import { buildInlineMenu, buildStickyMenuRow, MENU_ITEMS } from './menu.keyboard';

describe('buildInlineMenu', () => {
  it('contains exactly 10 buttons', () => {
    const markup = buildInlineMenu();
    const total = markup.reply_markup.inline_keyboard.reduce((sum, row) => sum + row.length, 0);
    expect(total).toBe(10);
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
