import { Telegraf } from 'telegraf';
import { envConfig } from '../config/env.config';
import { recordChatMessage } from '../services/chatActivity.service';
import { handleGlobalRatingCommand } from './commands/globalRating.command';
import { handleMetrCommand } from './commands/metr.command';
import { handleRatingCommand } from './commands/rating.command';
import { handleRoundCommand } from './commands/round.command';
import { handleSeasonCommand } from './commands/season.command';
import { handleSeasonHistoryCommand } from './commands/seasonHistory.command';
import { handleStatusCommand } from './commands/status.command';

const BOT_COMMANDS = [
  { command: 'metr', description: 'Виміряти (раз на 2 години)' },
  { command: 'status', description: 'Поточний результат і час до наступного виміру' },
  { command: 'rating', description: 'Топ-10 у цьому чаті' },
  { command: 'global_rating', description: 'Топ-10 серед усіх користувачів' },
  { command: 'season', description: 'Поточний сезон, твій приріст і місце в топі' },
  { command: 'round', description: 'Поточний раунд, тема тижня і твій прогрес' },
  { command: 'season_history', description: 'Чемпіони минулих сезонів' },
];

export function createBot(): Telegraf {
  const bot = new Telegraf(envConfig.botToken);

  bot.use((ctx, next) => {
    if (ctx.chat) {
      recordChatMessage(ctx.chat.id);
    }
    return next();
  });

  bot.command('metr', handleMetrCommand);
  bot.command('status', handleStatusCommand);
  bot.command('rating', handleRatingCommand);
  bot.command('global_rating', handleGlobalRatingCommand);
  bot.command('season', handleSeasonCommand);
  bot.command('round', handleRoundCommand);
  bot.command('season_history', handleSeasonHistoryCommand);

  bot.telegram.setMyCommands(BOT_COMMANDS).catch((error) => {
    console.error('[bot] failed to register command list', error);
  });

  bot.catch((error, ctx) => {
    console.error(`[bot] error while handling update ${ctx.updateType}`, error);
  });

  return bot;
}
