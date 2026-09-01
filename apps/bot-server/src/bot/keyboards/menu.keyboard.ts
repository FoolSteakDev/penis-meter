import type { Context } from 'telegraf';
import { Markup } from 'telegraf';
import type { ExtraReplyMessage } from 'telegraf/typings/telegram-types';
import { withActor } from '../utils/actor.util';

export interface MenuItem {
  key: string;
  label: string;
}

/** key -> callback_data `m:<key>`. Ключі короткі: ліміт callback_data — 64 байти. */
export const MENU_ITEMS: MenuItem[][] = [
  [
    { key: 'metr', label: '📏 Виміряти' },
    { key: 'status', label: '📊 Статус' },
  ],
  [
    { key: 'rating', label: '🏆 Рейтинг чату' },
    { key: 'grating', label: '🌍 Глобальний топ' },
  ],
  [
    { key: 'season', label: '🗓 Сезон' },
    { key: 'round', label: '🎯 Раунд' },
  ],
  [
    { key: 'ach', label: '🎖 Досягнення' },
    { key: 'quest', label: '🧭 Квести' },
  ],
  [
    { key: 'duel', label: '⚔️ Дуель' },
    { key: 'dhist', label: '📜 Історія дуелей' },
  ],
  [{ key: 'shist', label: '🏅 Чемпіони сезонів' }],
  [{ key: 'admin', label: '🛠️ Адмінка' }],
];

/** Повне inline-меню — для /menu і для натискання «📋 Меню». */
export function buildInlineMenu() {
  return Markup.inlineKeyboard(MENU_ITEMS.map((row) => row.map((item) => Markup.button.callback(item.label, `m:${item.key}`))));
}

/** Компактний «липкий» рядок — чіпляється до кожної відповіді бота в групі. */
export function buildStickyMenuRow() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('📏', 'm:metr'),
      Markup.button.callback('📊', 'm:status'),
      Markup.button.callback('📋 Меню', 'm:open'),
    ],
  ]);
}

/** Reply-клавіатура — ТІЛЬКИ для привату. */
export function buildReplyMenu() {
  return Markup.keyboard(MENU_ITEMS.map((row) => row.map((item) => item.label)))
    .resize()
    .persistent();
}

/**
 * Відповідь бота з меню внизу: у групі — компактний inline-рядок, у приваті —
 * нічого (там reply-клавіатура). Якщо `extra` вже несе свою inline-клавіатуру
 * (напр. status.command.ts), липкий рядок дописується ОКРЕМИМ рядком знизу,
 * а не затирає її — reply_markup може бути лише один на повідомлення.
 */
export async function replyWithMenu(ctx: Context, text: string, extra: ExtraReplyMessage = {}): Promise<unknown> {
  text = withActor(ctx, text, extra);

  if (ctx.chat?.type === 'private') {
    return ctx.reply(text, extra);
  }

  const sticky = buildStickyMenuRow();
  const existingMarkup = extra.reply_markup;
  const existingRows = existingMarkup && 'inline_keyboard' in existingMarkup ? existingMarkup.inline_keyboard : [];
  return ctx.reply(text, {
    ...extra,
    reply_markup: { inline_keyboard: [...existingRows, ...sticky.reply_markup.inline_keyboard] },
  });
}
