import type { Context, Telegraf } from 'telegraf';
import { buildInlineMenu, buildReplyMenu, MENU_ITEMS } from '../keyboards/menu.keyboard';
import { handleAchievementsCommand } from './achievements.command';
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

/** callback_data `m:<key>` -> той самий хендлер, що й у відповідної команди. */
export const MENU_HANDLERS: Record<string, MenuHandler> = {
  metr: handleMetrCommand,
  status: handleStatusCommand,
  rating: handleRatingCommand,
  grating: handleGlobalRatingCommand,
  season: handleSeasonCommand,
  round: handleRoundCommand,
  ach: handleAchievementsCommand,
  duel: handleDuelCommand,
  dhist: handleDuelHistoryCommand,
  shist: handleSeasonHistoryCommand,
  admin: handleAdminCommand,
};

function getCallbackData(ctx: Context): string | null {
  const query = ctx.callbackQuery;
  return query && 'data' in query ? query.data : null;
}

/** Диспетчер inline-кнопок меню (`bot.action(/^m:\w+$/, ...)` у bot.ts). */
export async function handleMenuAction(ctx: Context): Promise<void> {
  const key = /^m:(\w+)$/.exec(getCallbackData(ctx) ?? '')?.[1];
  // answerCbQuery ПЕРШИМ: у Telegram ~1 с на відповідь, інакше в юзера крутиться годинник.
  await ctx.answerCbQuery().catch(() => {});
  if (key === 'open') {
    await ctx.reply('📋 Меню', buildInlineMenu());
    return;
  }
  const handler = key ? MENU_HANDLERS[key] : undefined;
  if (!handler) {
    return;
  }
  await handler(ctx);
}

export async function handleMenuCommand(ctx: Context): Promise<void> {
  if (ctx.chat?.type === 'private') {
    await ctx.reply('📋 Меню відкрито.', buildReplyMenu());
    return;
  }
  await ctx.reply('📋 Меню. Тисни кнопку або введи команду.', buildInlineMenu());
}

export async function handleHideMenuCommand(ctx: Context): Promise<void> {
  if (ctx.chat?.type === 'private') {
    await ctx.reply('📋 Меню сховано. Повернути — /menu', { reply_markup: { remove_keyboard: true } });
    return;
  }
  await ctx.reply('Меню тепер inline — воно не займає місця. /menu щоб відкрити знову.');
}

/** Текст кнопки старої reply-клавіатури -> той самий хендлер (лишаємо на один реліз). */
const LEGACY_MENU_ACTIONS: Record<string, MenuHandler> = Object.fromEntries(
  MENU_ITEMS.flat().map((item) => [item.label, MENU_HANDLERS[item.key]]),
);

/** Reply-кнопки старого меню надсилають звичайний текст, тому їх треба ловити через hears. Лишаємо на один реліз. */
export function registerMenuButtons(bot: Telegraf): void {
  for (const [label, handler] of Object.entries(LEGACY_MENU_ACTIONS)) {
    bot.hears(label, handler);
  }
}
