import type { Context } from 'telegraf';
import { findOrCreateUser } from '../../services/user.service';
import { formatRemainingCooldown, isCooldownElapsed } from '../../utils/date.util';
import { getSizeTierLabel } from '../../utils/sizeTier.util';

export async function handleStatusCommand(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) {
    return;
  }

  const user = await findOrCreateUser({
    telegramId: from.id,
    username: from.username ?? null,
    firstName: from.first_name,
  });

  const cooldownStatus = isCooldownElapsed(user.last_measurement_at)
    ? 'доступно зараз ✅'
    : `через ${formatRemainingCooldown(user.last_measurement_at)}`;

  await ctx.reply(
    `📊 Твій поточний результат: ${user.value} см (${getSizeTierLabel(user.value)})\n⏳ Наступний вимір: ${cooldownStatus}`,
  );
}
