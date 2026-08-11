import type { Context } from 'telegraf';
import { MODE_SWITCH_COOLDOWN_HOURS } from '../../config/constants';
import { UserModel, type UserMode } from '../../database/models/user.model';
import { getDuelWinStats } from '../../services/duel.service';
import { findOrCreateUser } from '../../services/user.service';
import { formatRemaining, nowUtc } from '../../utils/date.util';
import { buildStatusView } from './status.command';

function getCallbackData(ctx: Context): string | null {
  const query = ctx.callbackQuery;
  return query && 'data' in query ? query.data : null;
}

/** bot.action(/^mode:(grow|drill)$/, ...) - перемикач режиму гравця з кнопки /status. */
export async function handleModeSwitchAction(ctx: Context): Promise<void> {
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

  if (user.mode_changed_at !== null) {
    const unlockAt = new Date(user.mode_changed_at.getTime() + MODE_SWITCH_COOLDOWN_HOURS * 60 * 60 * 1000);
    if (unlockAt.getTime() > nowUtc().valueOf()) {
      await ctx.answerCbQuery(`Перемкнути режим можна через ${formatRemaining(unlockAt)}`, { show_alert: true });
      return;
    }
  }

  // Атомарний CAS: mode у фільтрі захищає від подвійного перемикання при
  // паралельному натисканні кнопки (правило проєкту - не save(), див. /metr).
  const updated = await UserModel.findOneAndUpdate(
    { _id: user._id, mode: user.mode },
    { $set: { mode: target, mode_changed_at: nowUtc().toDate() } },
    { new: true },
  );
  if (!updated) {
    await ctx.answerCbQuery('Не вдалось перемкнути режим - спробуй ще раз', { show_alert: true });
    return;
  }

  const duelStats = await getDuelWinStats(from.id);
  const { text, markup } = buildStatusView(updated, duelStats);
  await ctx.editMessageText(text, markup);
  await ctx.answerCbQuery();
}
