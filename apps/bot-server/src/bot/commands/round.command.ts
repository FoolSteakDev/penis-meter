import type { Context } from 'telegraf';
import { replyWithMenu } from '../keyboards/menu.keyboard';
import { withActor } from '../utils/actor.util';
import { SEASON_START_DATE } from '../../config/constants';
import { getActiveTheme } from '../../services/game-state.service';
import { ensureRoundInitialized } from '../../services/round-lifecycle.service';
import { findOrCreateUser, getGrowthRank } from '../../services/user.service';
import { formatCmSigned } from '../../utils/number.util';
import { getCurrentRoundInfo, getDaysUntil } from '../../utils/season-round.util';

export async function handleRoundCommand(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) {
    return;
  }

  const info = getCurrentRoundInfo();
  if (info.roundNumber === 0 || !info.bounds) {
    const startDate = new Date(SEASON_START_DATE).toLocaleDateString('uk-UA');
    await ctx.reply(withActor(ctx, `🗓️ Раунди ще не почались. Старт: ${startDate}.`));
    return;
  }

  const gameState = await ensureRoundInitialized();
  const theme = getActiveTheme(gameState);

  const user = await findOrCreateUser({
    telegramId: from.id,
    username: from.username ?? null,
    firstName: from.first_name,
  });

  const daysLeft = getDaysUntil(info.bounds.endsAt);
  const roundRank = await getGrowthRank('round_growth', user.round_growth, user.mode);

  const lines = [
    `📅 Раунд ${info.roundInSeason}/4 (сезон ${info.seasonNumber})`,
    `⏳ До кінця раунду: ${daysLeft} дн.`,
    `📈 Твій приріст за раунд: ${formatCmSigned(user.round_growth)} см`,
    `🏅 Місце в глобальному топі раунду: ${roundRank}`,
  ];

  if (theme) {
    lines.push(`🎭 Тема тижня: ${theme.name} - ${theme.description}`);
  }

  await replyWithMenu(ctx, lines.join('\n'));
}
