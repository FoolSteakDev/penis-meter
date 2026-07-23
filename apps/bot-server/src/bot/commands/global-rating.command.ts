import type { Context } from 'telegraf';
import { getGlobalRating } from '../../services/user.service';
import { getSizeTierLabel } from '../../utils/size-tier.util';

export async function handleGlobalRatingCommand(ctx: Context): Promise<void> {
  const rating = await getGlobalRating();
  if (rating.length === 0) {
    await ctx.reply('Ще ніхто не вимірювався.');
    return;
  }

  const lines = rating.map((user, index) => {
    const label = user.username ?? user.firstName;
    return `${index + 1}. ${label} - ${user.value} см (${getSizeTierLabel(user.value)})`;
  });

  await ctx.reply(`🌍 Глобальний рейтинг:\n${lines.join('\n')}`);
}
