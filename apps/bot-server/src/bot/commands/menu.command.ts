import type { Context, Telegraf } from 'telegraf';
import { Markup } from 'telegraf';
import { handleDuelHistoryCommand } from './duel-history.command';
import { handleAdminCommand } from './admin.command';
import { handleDuelCommand } from './duel.command';
import { handleGlobalRatingCommand } from './global-rating.command';
import { handleMetrCommand } from './metr.command';
import { handleRatingCommand } from './rating.command';
import { handleRoundCommand } from './round.command';
import { handleSeasonCommand } from './season.command';
import { handleSeasonHistoryCommand } from './season-history.command';
import { handleStatusCommand } from './status.command';

type MenuHandler = (ctx: Context) => Promise<void>;

/** Розкладка reply-клавіатури: кожен рядок — рядок кнопок. */
const MENU_LAYOUT: string[][] = [
  ['📏 Виміряти', '📊 Статус'],
  ['🏆 Рейтинг чату', '🌍 Глобальний топ'],
  ['🗓 Сезон', '🎯 Раунд'],
  ['⚔️ Дуель', '📜 Історія дуелей'],
  ['🏅 Чемпіони сезонів', '🛠️ Адмінка'],
];

/** Текст кнопки → той самий хендлер, що й у відповідної команди. */
const MENU_ACTIONS: Record<string, MenuHandler> = {
  '📏 Виміряти': handleMetrCommand,
  '📊 Статус': handleStatusCommand,
  '🏆 Рейтинг чату': handleRatingCommand,
  '🌍 Глобальний топ': handleGlobalRatingCommand,
  '🗓 Сезон': handleSeasonCommand,
  '🎯 Раунд': handleRoundCommand,
  '⚔️ Дуель': handleDuelCommand,
  '📜 Історія дуелей': handleDuelHistoryCommand,
  '🏅 Чемпіони сезонів': handleSeasonHistoryCommand,
  '🛠️ Адмінка': handleAdminCommand,
};

function buildMenuMarkup() {
  return Markup.keyboard(MENU_LAYOUT)
    .resize()
    .persistent()
    // selective + відповідь на повідомлення юзера: у групі клавіатуру побачить лише той, хто викликав /menu.
    .selective();
}

export async function handleMenuCommand(ctx: Context): Promise<void> {
  const messageId = ctx.message?.message_id;

  await ctx.reply('📋 Меню відкрито. Тисни кнопку або введи команду.', {
    ...buildMenuMarkup(),
    ...(messageId ? { reply_parameters: { message_id: messageId } } : {}),
  });
}

export async function handleHideMenuCommand(ctx: Context): Promise<void> {
  const messageId = ctx.message?.message_id;

  await ctx.reply('📋 Меню сховано. Повернути — /menu', {
    // Markup.removeKeyboard() не має .selective(), тому reply_markup збираємо вручну.
    reply_markup: { remove_keyboard: true, selective: true },
    ...(messageId ? { reply_parameters: { message_id: messageId } } : {}),
  });
}

/** Reply-кнопки надсилають звичайний текст, тому їх треба ловити через hears. */
export function registerMenuButtons(bot: Telegraf): void {
  for (const [label, handler] of Object.entries(MENU_ACTIONS)) {
    bot.hears(label, handler);
  }
}
