import type { Context } from 'telegraf';
import { replyWithMenu } from '../keyboards/menu.keyboard';
import { SeasonModel } from '../../database/models/season.model';
import { formatCm } from '../../utils/number.util';
import { userLabel } from '../../utils/user-label.util';

const HISTORY_LIMIT = 10;

export async function handleSeasonHistoryCommand(ctx: Context): Promise<void> {
  const seasons = await SeasonModel.find().sort({ season_number: -1 }).limit(HISTORY_LIMIT);
  if (seasons.length === 0) {
    await ctx.reply('Ще жоден сезон не завершився.');
    return;
  }

  const chatId = ctx.chat && ctx.chat.type !== 'private' ? ctx.chat.id : null;

  const lines = seasons.map((season) => {
    const globalChampion = season.top_global[0];
    const chatTop = chatId !== null ? season.top_by_chat.find((c) => c.chat_id === chatId) : undefined;
    const chatChampion = chatTop?.top[0];

    let line = `Сезон ${season.season_number}: 🌍 ${
      globalChampion ? `${userLabel(globalChampion)} (+${formatCm(globalChampion.growth)} см)` : '—'
    }`;
    if (chatId !== null) {
      line += ` · 💬 ${chatChampion ? `${userLabel(chatChampion)} (+${formatCm(chatChampion.growth)} см)` : '—'}`;
    }
    return line;
  });

  await replyWithMenu(ctx, `🏆 Історія сезонів:\n${lines.join('\n')}`);
}
