import type { Context } from 'telegraf';
import { replyWithMenu } from '../keyboards/menu.keyboard';
import { ConcurrentMeasurementError, performMeasurement } from '../../services/measurement.service';
import { findOrCreateUser } from '../../services/user.service';
import { formatRemainingCooldown, isCooldownElapsed } from '../../utils/date.util';
import { getSizeTierLabel } from '../../utils/size-tier.util';

export async function handleMetrCommand(ctx: Context): Promise<void> {
  const from = ctx.from;
  const chat = ctx.chat;
  if (!from || !chat) {
    return;
  }

  const user = await findOrCreateUser({
    telegramId: from.id,
    username: from.username ?? null,
    firstName: from.first_name,
  });

  if (!isCooldownElapsed(user.last_measurement_at)) {
    const remaining = formatRemainingCooldown(user.last_measurement_at);
    // Передчасна спроба одразу рве streak "вчасних" вимірів (див. п.2 плану).
    if (user.streak_current !== 0) {
      user.streak_current = 0;
      await user.save();
    }
    await ctx.reply(`⏳ Наступний вимір буде доступний через ${remaining}.`);
    return;
  }

  let outcome;
  try {
    outcome = await performMeasurement(user, chat.id);
  } catch (error) {
    if (error instanceof ConcurrentMeasurementError) {
      await ctx.reply('⏳ Вимір уже виконується, спробуй за секунду.');
      return;
    }
    throw error;
  }

  const deltaSign = outcome.delta >= 0 ? '+' : '';
  const lines = [
    `📏 Було: ${outcome.previousValue} см`,
    `${deltaSign}${outcome.delta} см`,
  ];

  if (outcome.conditionName && outcome.message) {
    lines.push(`🎲 ${outcome.conditionName}: ${outcome.message}`);
  }

  lines.push(`📊 Стало: ${outcome.newValue} см (${getSizeTierLabel(outcome.newValue)})`);

  await replyWithMenu(ctx, lines.join('\n'));
}
