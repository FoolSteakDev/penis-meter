import type { Context } from 'telegraf';
import { Markup } from 'telegraf';
import { envConfig } from '../../config/env.config';

/** Inline web_app-кнопка працює і в приватних чатах, і в групах (на відміну від reply-кнопки чи Menu Button). */
export async function handleAdminCommand(ctx: Context): Promise<void> {
  if (!envConfig.adminPanelUrl) {
    await ctx.reply('🛠️ Адмінка не налаштована (ADMIN_PANEL_URL).');
    return;
  }

  await ctx.reply(
    '🛠️ Адмінка',
    Markup.inlineKeyboard([[Markup.button.webApp('Відкрити адмінку', envConfig.adminPanelUrl)]]),
  );
}
