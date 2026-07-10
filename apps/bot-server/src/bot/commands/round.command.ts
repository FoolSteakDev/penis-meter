import type { Context } from 'telegraf';
import { SEASON_START_DATE } from '../../config/constants';
import { ensureRoundInitialized, getActiveTheme } from '../../services/gameState.service';
import { findOrCreateUser, getGrowthRank } from '../../services/user.service';
import { getCurrentRoundInfo, getDaysUntil } from '../../utils/seasonRound.util';

export async function handleRoundCommand(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) {
    return;
  }

  const info = getCurrentRoundInfo();
  if (info.roundNumber === 0 || !info.bounds) {
    const startDate = new Date(SEASON_START_DATE).toLocaleDateString('uk-UA');
    await ctx.reply(`🗓️ Раунди ще не почались. Старт: ${startDate}.`);
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
  const growthSign = user.round_growth >= 0 ? '+' : '';
  const roundRank = await getGrowthRank('round_growth', user.round_growth);

  const lines = [
    `📅 Раунд ${info.roundInSeason}/4 (сезон ${info.seasonNumber})`,
    `⏳ До кінця раунду: ${daysLeft} дн.`,
    `📈 Твій приріст за раунд: ${growthSign}${user.round_growth} см`,
    `🏅 Місце в глобальному топі раунду: ${roundRank}`,
  ];

  if (theme) {
    lines.push(`🎭 Тема тижня: ${theme.name} - ${theme.description}`);
  }

  await ctx.reply(lines.join('\n'));
}
