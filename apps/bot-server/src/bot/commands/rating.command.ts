import type { Context } from 'telegraf';
import { replyWithMenu } from '../keyboards/menu.keyboard';
import { getChatRating } from '../../services/user.service';
import { getSizeTierLabel } from '../../utils/size-tier.util';

export async function handleRatingCommand(ctx: Context): Promise<void> {
  if (!ctx.chat || ctx.chat.type === 'private') {
    await ctx.reply('Ця команда доступна лише в групових чатах.');
    return;
  }

  const rating = await getChatRating(ctx.chat.id);
  if (rating.length === 0) {
    await ctx.reply('У цьому чаті ще ніхто не вимірювався.');
    return;
  }

  const lines = rating.map((user, index) => {
    const label = user.username ?? user.firstName;
    return `${index + 1}. ${label} - ${user.value} см (${getSizeTierLabel(user.value)})`;
  });

  await replyWithMenu(ctx, `🏆 Рейтинг чату:\n${lines.join('\n')}`);
}
