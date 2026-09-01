import type { Context } from 'telegraf';
import { Markup } from 'telegraf';
import { MODE_SWITCH_COOLDOWN_HOURS } from '../../config/constants';
import { UserModel, type UserHydratedDocument, type UserMode } from '../../database/models/user.model';
import { formatUnlocks } from '../../achievements/achievement-announce';
import { safeBump } from '../../achievements/achievement-progress.service';
import { getAchievementSettings } from '../../achievements/achievement-settings.service';
import { safeSync } from '../../achievements/achievement.service';
import { safeQuestEvent } from '../../quests/quest.service';
import { getDuelWinStats } from '../../services/duel.service';
import { findOrCreateUser } from '../../services/user.service';
import { formatRemaining, nowUtc } from '../../utils/date.util';
import { MODE_LABELS, modeSign } from '../../utils/mode.util';
import { formatCm } from '../../utils/number.util';
import { userLabel } from '../../utils/user-label.util';
import { buildStatusView } from './status.command';

function getCallbackData(ctx: Context): string | null {
  const query = ctx.callbackQuery;
  return query && 'data' in query ? query.data : null;
}

/** null, якщо кулдаун уже минув (або ніколи не перемикав). */
function cooldownUnlockAt(user: Pick<UserHydratedDocument, 'mode_changed_at'>): Date | null {
  if (user.mode_changed_at === null) {
    return null;
  }
  const unlockAt = new Date(user.mode_changed_at.getTime() + MODE_SWITCH_COOLDOWN_HOURS * 60 * 60 * 1000);
  return unlockAt.getTime() > nowUtc().valueOf() ? unlockAt : null;
}

const MODE_NOUN: Record<UserMode, string> = { grow: 'росту', drill: 'буріння' };
const MODE_SIGN_CONSTRAINT: Record<UserMode, string> = { grow: "від'ємним", drill: 'додатним' };

/** bot.action(/^mode:(grow|drill)$/, ...) - крок 1: екран підтвердження, нічого не пише в БД. */
export async function handleModeSwitchPromptAction(ctx: Context): Promise<void> {
  const from = ctx.from;
  const match = /^mode:(grow|drill)$/.exec(getCallbackData(ctx) ?? '');
  if (!match || !from) {
    return;
  }
  const target = match[1] as UserMode;

  const user = await findOrCreateUser({
    telegramId: from.id,
    username: from.username ?? null,
    firstName: from.first_name,
  });

  if (user.mode === target) {
    await ctx.answerCbQuery('Ти вже в цьому режимі');
    return;
  }

  const unlockAt = cooldownUnlockAt(user);
  if (unlockAt) {
    await ctx.answerCbQuery(`Перемкнути режим можна через ${formatRemaining(unlockAt)}`, { show_alert: true });
    return;
  }

  const mismatched = user.value * modeSign(target) < 0;
  const burned = Math.abs(user.value);

  const lines = mismatched
    ? [
        '⚠️ УВАГА: перемикання ОБНУЛИТЬ твій результат',
        '',
        `🎯 Режим: ${MODE_LABELS[user.mode]} → ${MODE_LABELS[target]}`,
        '',
        'Умови:',
        `• У режимі ${MODE_NOUN[target]} значення не може бути ${MODE_SIGN_CONSTRAINT[target]}.`,
        `• Твої ${formatCm(burned)} см ЗГОРЯТЬ ДОЩЕНТУ - value стане 0 см.`,
        `• ${formatCm(burned)} см також віднімуться від приросту за раунд і за сезон.`,
        '• Це незворотно. Наступний раз перемкнути можна буде через 24 год.',
      ]
    : [
        `🎯 Перемкнути режим на «${MODE_LABELS[target]}»?`,
        '',
        'Умови:',
        '• Наступний раз перемкнути можна буде через 24 год.',
        '• Усі майбутні дельти дзеркаляться: те, що росло вгору, тепер піде вниз.',
        `• Твої ${formatCm(user.value)} см лишаються без змін.`,
      ];

  const markup = Markup.inlineKeyboard([
    [
      Markup.button.callback(
        mismatched ? `🔥 Так, спалити ${formatCm(burned)} см` : '✅ Так, перемкнути',
        `mode:go:${target}`,
      ),
    ],
    [Markup.button.callback('↩️ Скасувати', 'mode:cancel')],
  ]);

  await ctx.editMessageText(lines.join('\n'), markup);
  await ctx.answerCbQuery();
}

/** bot.action(/^mode:go:(grow|drill)$/, ...) - крок 2: власне перемикання + обнулення при незбіжному знаку. */
export async function handleModeSwitchConfirmAction(ctx: Context): Promise<void> {
  const from = ctx.from;
  const match = /^mode:go:(grow|drill)$/.exec(getCallbackData(ctx) ?? '');
  if (!match || !from) {
    return;
  }
  const target = match[1] as UserMode;

  const user = await findOrCreateUser({
    telegramId: from.id,
    username: from.username ?? null,
    firstName: from.first_name,
  });

  const unlockAt = cooldownUnlockAt(user);
  if (unlockAt) {
    await ctx.answerCbQuery(`Перемкнути режим можна через ${formatRemaining(unlockAt)}`, { show_alert: true });
    return;
  }

  const burned = Math.abs(user.value);
  const mismatched = user.value * modeSign(target) < 0;

  // CAS з value у фільтрі - між показом екрана і натисканням "Так" гравець
  // міг устигнути прийняти дуель чи зробити /metr, і спалити треба рівно ту
  // суму, яку йому показали, або не спалити нічого.
  const updated = await UserModel.findOneAndUpdate(
    { _id: user._id, mode: user.mode, value: user.value },
    mismatched
      ? {
          $set: { mode: target, mode_changed_at: nowUtc().toDate(), value: 0 },
          // Віднімаємо |value|, а НЕ (-value): інакше буровик на -50, що
          // тікає в grow, отримав би +50 до приросту - нагороду за спалення.
          $inc: { season_growth: -burned, round_growth: -burned },
        }
      : { $set: { mode: target, mode_changed_at: nowUtc().toDate() } },
    { new: true },
  );
  if (!updated) {
    await ctx.answerCbQuery('Твоє значення щойно змінилось - відкрий /status і спробуй ще раз', {
      show_alert: true,
    });
    return;
  }

  if (mismatched) {
    console.log('[mode] burn', { telegram_id: from.id, from: user.mode, to: target, burned });
  }

  await safeBump(user.telegram_id, { inc: { 'counters.mode_switches': 1 } });

  if (ctx.chat) {
    void safeQuestEvent(user.telegram_id, { type: 'mode_switch', chatId: ctx.chat.id, to: target });
  }

  const duelStats = await getDuelWinStats(from.id);
  const { text, markup } = buildStatusView(updated, duelStats);
  const finalText = mismatched ? `🔥 Згоріло: ${formatCm(burned)} см\n\n${text}` : text;

  await ctx.editMessageText(finalText, markup);
  await ctx.answerCbQuery();

  const unlocks = await safeSync(updated.telegram_id);
  if (unlocks.length) {
    const settings = await getAchievementSettings();
    if (settings.announce_enabled) {
      await ctx.reply(formatUnlocks(userLabel(updated), unlocks));
    }
  }
}

/** bot.action('mode:cancel', ...) - повернутись до звичайного /status, нічого не міняючи. */
export async function handleModeCancelAction(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) {
    return;
  }

  const user = await findOrCreateUser({
    telegramId: from.id,
    username: from.username ?? null,
    firstName: from.first_name,
  });

  const duelStats = await getDuelWinStats(from.id);
  const { text, markup } = buildStatusView(user, duelStats);

  await ctx.editMessageText(text, markup);
  await ctx.answerCbQuery();
}
