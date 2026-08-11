import type { Context } from 'telegraf';
import { replyWithMenu } from '../keyboards/menu.keyboard';
import { withActor } from '../utils/actor.util';
import { ConcurrentMeasurementError, performMeasurement } from '../../services/measurement.service';
import { findOrCreateUser } from '../../services/user.service';
import { formatRemainingCooldown, isCooldownElapsed } from '../../utils/date.util';
import { MODE_LABELS } from '../../utils/mode.util';
import { formatCm, formatCmSigned } from '../../utils/number.util';
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
    await ctx.reply(withActor(ctx, `⏳ Наступний вимір буде доступний через ${remaining}.`));
    return;
  }

  let outcome;
  try {
    outcome = await performMeasurement(user, chat.id);
  } catch (error) {
    if (error instanceof ConcurrentMeasurementError) {
      await ctx.reply(withActor(ctx, '⏳ Вимір уже виконується, спробуй за секунду.'));
      return;
    }
    throw error;
  }

  // Буровик читає "Було/Стало" в термінах глибини, а не висоти - емодзі й
  // напрямок дельти підказують це, не чіпаючи самі тіри (size-tier.util.ts)
  // чи текст критичних модифікаторів (свідомо, див. 3.7 плану).
  const isDrill = user.mode === 'drill';
  const depthHint = isDrill ? (outcome.delta < 0 ? '  ← глибше' : outcome.delta > 0 ? '  ← спливає' : '') : '';

  const lines = [
    `${isDrill ? '🕳 Було' : '📏 Було'}: ${formatCm(outcome.previousValue)} см`,
    `${formatCmSigned(outcome.delta)} см${depthHint}`,
  ];

  if (outcome.conditionName && outcome.message) {
    lines.push(`🎲 ${outcome.conditionName}: ${outcome.message}`);
  }

  // Дельта в рядку вище вже фактична (обрізана клампом), а не накидана
  // модифікатором - тут лишається лише сказати, ЧОМУ вона обрізана.
  if (outcome.clamped) {
    const boundaryHint = isDrill ? 'вище не піднімешся' : 'нижче не опустишся';
    lines.push(`📊 Стало: ${formatCm(outcome.newValue)} см — межа режиму «${MODE_LABELS[user.mode]}», ${boundaryHint}`);
  } else {
    lines.push(`📊 Стало: ${formatCm(outcome.newValue)} см (${getSizeTierLabel(outcome.newValue)})`);
  }

  await replyWithMenu(ctx, lines.join('\n'));
}
