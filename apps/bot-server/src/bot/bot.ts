import { Telegraf } from 'telegraf';
import { envConfig } from '../config/env.config';
import { recordChatMessage } from '../services/chat-activity.service';
import { handleAdminCommand } from './commands/admin.command';
import { handleDuelHistoryCommand, handleDuelHistoryMeAction } from './commands/duel-history.command';
import {
  handleDuelAcceptAction,
  handleDuelCommand,
  handleDuelDeclineAction,
  handleDuelInviteAction,
} from './commands/duel.command';
import { handleGlobalRatingCommand } from './commands/global-rating.command';
import {
  handleHideMenuCommand,
  handleMenuCommand,
  registerMenuButtons,
} from './commands/menu.command';
import { handleMetrCommand } from './commands/metr.command';
import { handleRatingCommand } from './commands/rating.command';
import { handleRoundCommand } from './commands/round.command';
import { handleSeasonCommand } from './commands/season.command';
import { handleSeasonHistoryCommand } from './commands/season-history.command';
import { handleStatusCommand } from './commands/status.command';

const BOT_COMMANDS = [
  { command: 'menu', description: 'Показати меню з кнопками' },
  { command: 'hide_menu', description: 'Сховати меню з кнопками' },
  { command: 'metr', description: 'Виміряти (раз на 2 години)' },
  { command: 'status', description: 'Поточний результат і час до наступного виміру' },
  { command: 'rating', description: 'Топ-10 у цьому чаті' },
  { command: 'global_rating', description: 'Топ-10 серед усіх користувачів' },
  { command: 'season', description: 'Поточний сезон, твій приріст і місце в топі' },
  { command: 'round', description: 'Поточний раунд, тема тижня і твій прогрес' },
  { command: 'season_history', description: 'Чемпіони минулих сезонів' },
  { command: 'duel', description: 'Викликати когось у чаті на дуель' },
  { command: 'duel_history', description: 'Історія дуелей цього чату' },
  { command: 'admin', description: 'Відкрити адмін-панель' },
];

export function createBot(): Telegraf {
  const bot = new Telegraf(envConfig.botToken);

  bot.use((ctx, next) => {
    if (ctx.chat) {
      recordChatMessage(ctx.chat.id);
    }
    return next();
  });

  bot.command('menu', handleMenuCommand);
  bot.command('hide_menu', handleHideMenuCommand);
  bot.command('metr', handleMetrCommand);
  bot.command('status', handleStatusCommand);
  bot.command('rating', handleRatingCommand);
  bot.command('global_rating', handleGlobalRatingCommand);
  bot.command('season', handleSeasonCommand);
  bot.command('round', handleRoundCommand);
  bot.command('season_history', handleSeasonHistoryCommand);
  bot.command('duel', handleDuelCommand);
  bot.command('duel_history', handleDuelHistoryCommand);
  bot.command('admin', handleAdminCommand);

  registerMenuButtons(bot);

  bot.action(/^duel:invite:\d+:\d+$/, handleDuelInviteAction);
  bot.action(/^duel:accept:[a-f0-9]{24}$/, handleDuelAcceptAction);
  bot.action(/^duel:decline:[a-f0-9]{24}$/, handleDuelDeclineAction);
  bot.action('duel:history:me', handleDuelHistoryMeAction);

  bot.telegram.setMyCommands(BOT_COMMANDS).catch((error) => {
    console.error('[bot] failed to register command list', error);
  });

  bot.catch((error, ctx) => {
    console.error(`[bot] error while handling update ${ctx.updateType}`, error);
  });

  return bot;
}
