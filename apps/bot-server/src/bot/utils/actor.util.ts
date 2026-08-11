import type { Context } from 'telegraf';
import type { ExtraReplyMessage } from 'telegraf/typings/telegram-types';

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Ім'я того, хто викликав команду/натиснув кнопку. СВІДОМО first_name, а не
 * @username: Telegram автолінкує @mention навіть без parse_mode і пушить
 * сповіщення, а підпис має бути мовчазним (див. 1.2 плану).
 */
export function actorName(ctx: Context): string | null {
  return ctx.from?.first_name ?? null;
}

/**
 * Дописує «👤 Ім'я» першим рядком. У приваті — no-op (там і так очевидно, хто питав).
 * Екранує ім'я лише якщо extra.parse_mode === 'HTML' — інакше текст іде як є.
 */
export function withActor(ctx: Context, text: string, extra?: ExtraReplyMessage): string {
  if (ctx.chat?.type === 'private') {
    return text;
  }

  const name = actorName(ctx);
  if (!name) {
    return text;
  }

  const label = extra?.parse_mode === 'HTML' ? escapeHtml(name) : name;
  return `👤 ${label}\n${text}`;
}
