import { Telegraf } from 'telegraf';
import { envConfig } from '../config/env.config';
import { handleGlobalRatingCommand } from './commands/globalRating.command';
import { handleMetrCommand } from './commands/metr.command';
import { handleRatingCommand } from './commands/rating.command';
import { handleStatusCommand } from './commands/status.command';

const BOT_COMMANDS = [
  { command: 'metr', description: 'Виміряти (раз на 12 годин)' },
  { command: 'status', description: 'Поточний результат і час до наступного виміру' },
  { command: 'rating', description: 'Топ-10 у цьому чаті' },
  { command: 'global_rating', description: 'Топ-10 серед усіх користувачів' },
];

export function createBot(): Telegraf {
  const bot = new Telegraf(envConfig.botToken);

  bot.command('metr', handleMetrCommand);
  bot.command('status', handleStatusCommand);
  bot.command('rating', handleRatingCommand);
  bot.command('global_rating', handleGlobalRatingCommand);

  bot.telegram.setMyCommands(BOT_COMMANDS).catch((error) => {
    console.error('[bot] failed to register command list', error);
  });

  bot.catch((error, ctx) => {
    console.error(`[bot] error while handling update ${ctx.updateType}`, error);
  });

  return bot;
}
