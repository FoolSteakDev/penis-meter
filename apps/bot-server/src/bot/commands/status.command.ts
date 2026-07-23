import type { Context } from 'telegraf';
import { Markup } from 'telegraf';
import { findOrCreateUser } from '../../services/user.service';
import { formatRemainingCooldown, isCooldownElapsed } from '../../utils/date.util';
import { getExperienceRankLabel } from '../../utils/experience-rank.util';
import { getSizeTierLabel } from '../../utils/size-tier.util';

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

  const lines = [
    `📊 Твій поточний результат: ${user.value} см (${getSizeTierLabel(user.value)})`,
    `⏳ Наступний вимір: ${cooldownStatus}`,
    `🧠 Ранг досвіду: ${getExperienceRankLabel(user.experience)} (${user.experience} exp)`,
  ];

  if (user.streak_current > 1) {
    lines.push(`🔥 Серія вчасних вимірів: ${user.streak_current} (рекорд: ${user.streak_best})`);
  } else if (user.streak_best > 1) {
    lines.push(`🔥 Рекорд серії вчасних вимірів: ${user.streak_best}`);
  }

  await ctx.reply(
    lines.join('\n'),
    Markup.inlineKeyboard([[Markup.button.callback('⚔️ Історія дуелей', 'duel:history:me')]]),
  );
}
