import type { Context } from 'telegraf';
import { Markup } from 'telegraf';
import { replyWithMenu } from '../keyboards/menu.keyboard';
import { getDuelWinStats, type DuelWinStats } from '../../services/duel.service';
import { findOrCreateUser } from '../../services/user.service';
import type { UserHydratedDocument, UserMode } from '../../database/models/user.model';
import { formatRemainingCooldown, isCooldownElapsed } from '../../utils/date.util';
import { getExperienceRankLabel } from '../../utils/experience-rank.util';
import { MODE_LABELS } from '../../utils/mode.util';
import { formatCm } from '../../utils/number.util';
import { getSizeTierLabel } from '../../utils/size-tier.util';

export interface StatusView {
  text: string;
  markup: ReturnType<typeof Markup.inlineKeyboard>;
}

/** Спільна побудова тексту/клавіатури /status - використовується і командою, і mode.command.ts::handleModeSwitchAction після перемикання. */
export function buildStatusView(user: UserHydratedDocument, duelStats: DuelWinStats): StatusView {
  const cooldownStatus = isCooldownElapsed(user.last_measurement_at)
    ? 'доступно зараз ✅'
    : `через ${formatRemainingCooldown(user.last_measurement_at)}`;

  const lines = [
    `📊 Твій поточний результат: ${formatCm(user.value)} см (${getSizeTierLabel(user.value)})`,
    `🎯 Режим: ${MODE_LABELS[user.mode]}`,
    `⏳ Наступний вимір: ${cooldownStatus}`,
    `🧠 Ранг досвіду: ${getExperienceRankLabel(user.experience)} (${user.experience} exp)`,
  ];

  if (user.streak_current > 1) {
    lines.push(`🔥 Серія вчасних вимірів: ${user.streak_current} (рекорд: ${user.streak_best})`);
  } else if (user.streak_best > 1) {
    lines.push(`🔥 Рекорд серії вчасних вимірів: ${user.streak_best}`);
  }

  if (duelStats.total > 0) {
    const winRate = Math.round((duelStats.wins / duelStats.total) * 100);
    lines.push(`⚔️ Перемоги в дуелях: ${duelStats.wins}/${duelStats.total} (${winRate}%)`);
  }

  const otherMode: UserMode = user.mode === 'drill' ? 'grow' : 'drill';
  const markup = Markup.inlineKeyboard([
    [Markup.button.callback(`Перемкнути на «${MODE_LABELS[otherMode]}»`, `mode:${otherMode}`)],
    [Markup.button.callback('⚔️ Історія дуелей', 'duel:history:me')],
  ]);

  return { text: lines.join('\n'), markup };
}

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

  const duelStats = await getDuelWinStats(from.id);
  const { text, markup } = buildStatusView(user, duelStats);

  await replyWithMenu(ctx, text, markup);
}
