import type { Context } from 'telegraf';
import { replyWithMenu } from '../keyboards/menu.keyboard';
import { getGlobalRating } from '../../services/user.service';
import { formatCm } from '../../utils/number.util';
import { getSizeTierLabel } from '../../utils/size-tier.util';

export async function handleGlobalRatingCommand(ctx: Context): Promise<void> {
  const rating = await getGlobalRating();
  if (rating.length === 0) {
    await ctx.reply('Ще ніхто не вимірювався.');
    return;
  }

  const lines = rating.map((user, index) => {
    const label = user.username ?? user.firstName;
    return `${index + 1}. ${label} - ${formatCm(user.value)} см (${getSizeTierLabel(user.value)})`;
  });

  await replyWithMenu(ctx, `🌍 Глобальний рейтинг:\n${lines.join('\n')}`);
}
