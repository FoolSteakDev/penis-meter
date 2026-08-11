import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import { envConfig, requireBotToken } from '../config/env.config';
import { recordChatMessage } from '../services/chat-activity.service';
import { handleAdminCommand } from './commands/admin.command';
import { handleDuelHistoryCommand, handleDuelHistoryMeAction } from './commands/duel-history.command';
import {
  handleDuelAcceptAction,
  handleDuelAutoStakeAction,
  handleDuelBackAction,
  handleDuelCancelAction,
  handleDuelCommand,
  handleDuelCustomStakeAction,
  handleDuelDeclineAction,
  handleDuelPageAction,
  handleDuelPickAction,
  handleDuelStakeReply,
  handleOutdatedDuelAction,
} from './commands/duel.command';
import { handleGlobalRatingCommand } from './commands/global-rating.command';
import {
  handleHideMenuCommand,
  handleMenuAction,
  handleMenuCommand,
  registerMenuButtons,
} from './commands/menu.command';
import { handleMetrCommand } from './commands/metr.command';
import { handleModeSwitchAction } from './commands/mode.command';
import { handleRatingCommand } from './commands/rating.command';
import { handleRoundCommand } from './commands/round.command';
import { handleSeasonCommand } from './commands/season.command';
import { handleSeasonHistoryCommand } from './commands/season-history.command';
import { handleStatusCommand } from './commands/status.command';
import { refreshKnownUserProfile } from '../services/user.service';

/** «2 год», «1.5 год», «30 хв» - враховує дробові значення MEASUREMENT_COOLDOWN_HOURS (напр. 0.05 для тестів). */
function formatCooldownLabel(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)} хв`;
  }
  return `${hours} год`;
}

const BOT_COMMANDS = [
  { command: 'menu', description: 'Показати меню з кнопками' },
  { command: 'hide_menu', description: 'Сховати меню з кнопками' },
  { command: 'metr', description: `Виміряти (раз на ${formatCooldownLabel(envConfig.measurementCooldownHours)})` },
  { command: 'status', description: 'Поточний результат і час до наступного виміру' },
  { command: 'rating', description: 'Топ-10 у цьому чаті' },
  { command: 'global_rating', description: 'Топ-10 серед усіх користувачів' },
  { command: 'season', description: 'Поточний сезон, твій приріст і місце в топі' },
  { command: 'round', description: 'Поточний раунд, тема тижня і твій прогрес' },
  { command: 'season_history', description: 'Чемпіони минулих сезонів' },
  { command: 'duel', description: 'Викликати на дуель зі ставкою' },
  { command: 'duel_history', description: 'Історія дуелей цього чату' },
  { command: 'admin', description: 'Відкрити адмін-панель' },
];

export function createBot(): Telegraf {
  const bot = new Telegraf(requireBotToken());

  bot.use((ctx, next) => {
    // Лише 'message' - інакше callback_query (натискання кнопок дуелі тощо)
    // теж накручує "активність чату" й спотворює статистику для chat_activity.
    if (ctx.chat && ctx.updateType === 'message') {
      recordChatMessage(ctx.chat.id);
    }
    // Без await - не блокуємо обробку апдейту заради дешевого оновлення
    // профілю. Тримає username свіжим, щоб @username-меншн у дуелях
    // (mention.util.ts::hasReliableMention) не деградував до менш надійного
    // tg://user?id= через застарілі дані.
    if (ctx.from) {
      void refreshKnownUserProfile({
        telegramId: ctx.from.id,
        username: ctx.from.username ?? null,
        firstName: ctx.from.first_name,
      }).catch((error) => {
        console.error('[bot] failed to refresh user profile', error);
      });
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

  // Має бути ДО registerMenuButtons - інакше bot.hears(...) для кнопок меню
  // ловив би текст першим, і ForceReply-відповідь на ставку до них ніколи б
  // не дійшла. handleDuelStakeReply сам робить ранній next(), коли
  // повідомлення не є відповіддю на активну чернетку.
  bot.on(message('text'), handleDuelStakeReply);

  registerMenuButtons(bot);

  bot.action(/^m:\w+$/, handleMenuAction);

  bot.action(/^d:pick:\d+:\d+$/, handleDuelPickAction);
  bot.action(/^d:page:\d+:\d+$/, handleDuelPageAction);
  bot.action(/^d:auto:[a-f0-9]{24}$/, handleDuelAutoStakeAction);
  bot.action(/^d:cust:[a-f0-9]{24}$/, handleDuelCustomStakeAction);
  bot.action(/^d:back:[a-f0-9]{24}$/, handleDuelBackAction);
  bot.action(/^d:acc:[a-f0-9]{24}$/, handleDuelAcceptAction);
  bot.action(/^d:dec:[a-f0-9]{24}$/, handleDuelDeclineAction);
  bot.action(/^d:cancel:[a-f0-9]{24}$/, handleDuelCancelAction);
  bot.action('duel:history:me', handleDuelHistoryMeAction);

  bot.action(/^mode:(grow|drill)$/, handleModeSwitchAction);

  // Стара схема (до короткого d:* префікса) - лишаємо на один реліз, щоб
  // кнопки у вже надісланих повідомленнях не мовчали.
  bot.action(/^duel:invite:\d+:\d+$/, handleOutdatedDuelAction);
  bot.action(/^duel:accept:[a-f0-9]{24}$/, handleOutdatedDuelAction);
  bot.action(/^duel:decline:[a-f0-9]{24}$/, handleOutdatedDuelAction);

  bot.telegram.setMyCommands(BOT_COMMANDS).catch((error) => {
    console.error('[bot] failed to register command list', error);
  });

  bot.catch((error, ctx) => {
    console.error(`[bot] error while handling update ${ctx.updateType}`, error);
  });

  return bot;
}
