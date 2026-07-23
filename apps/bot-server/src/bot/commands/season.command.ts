import type { Context } from 'telegraf';
import { SEASON_START_DATE } from '../../config/constants';
import { findOrCreateUser, getGrowthRank } from '../../services/user.service';
import { getCurrentRoundInfo, getDaysUntil, getSeasonBounds } from '../../utils/season-round.util';

export async function handleSeasonCommand(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) {
    return;
  }

  const info = getCurrentRoundInfo();
  if (info.roundNumber === 0) {
    const startDate = new Date(SEASON_START_DATE).toLocaleDateString('uk-UA');
    await ctx.reply(`🗓️ Сезони ще не почались. Старт першого сезону: ${startDate}.`);
    return;
  }

  const user = await findOrCreateUser({
    telegramId: from.id,
    username: from.username ?? null,
    firstName: from.first_name,
  });

  const seasonBounds = getSeasonBounds(info.seasonNumber);
  const daysLeft = getDaysUntil(seasonBounds.endsAt);
  const globalRank = await getGrowthRank('season_growth', user.season_growth);

  const growthSign = user.season_growth >= 0 ? '+' : '';
  const lines = [
    `🗓️ Сезон ${info.seasonNumber}, раунд ${info.roundInSeason}/4`,
    `⏳ До кінця сезону: ${daysLeft} дн.`,
    `📈 Твій приріст за сезон: ${growthSign}${user.season_growth} см`,
    `🌍 Місце в глобальному топі сезону: ${globalRank}`,
  ];

  if (ctx.chat && ctx.chat.type !== 'private') {
    const chatRank = await getGrowthRank('season_growth', user.season_growth, ctx.chat.id);
    lines.push(`💬 Місце в топі цього чату: ${chatRank}`);
  }

  await ctx.reply(lines.join('\n'));
}
