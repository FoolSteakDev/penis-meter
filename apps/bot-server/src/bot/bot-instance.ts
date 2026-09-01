import type { Telegraf } from 'telegraf';

let instance: Telegraf | null = null;

/**
 * Встановлюється один раз у bot.ts::createBot(). Потрібен quest.service.ts,
 * щоб слати анонси закриття квесту, коли квест закривається достроково з
 * глибини гарячого шляху (measurement/duel/mode-хуки) - там немає ні ctx,
 * ні bot напряму, на відміну від sweeper'а (bot/scheduler.ts), якому bot
 * передають явним параметром.
 */
export function setBotInstance(bot: Telegraf): void {
  instance = bot;
}

export function getBotInstance(): Telegraf | null {
  return instance;
}
