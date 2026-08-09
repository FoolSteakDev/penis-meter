import type { Context } from 'telegraf';
import { replyWithMenu } from '../keyboards/menu.keyboard';
import type { DuelHistoryHydratedDocument } from '../../database/models/duel-history.model';
import { getChatDuelHistory, getPersonalDuelHistory } from '../../services/duel.service';
import { getUserByTelegramId } from '../../services/user.service';
import { userLabel } from '../../utils/user-label.util';

async function formatDuelLine(entry: DuelHistoryHydratedDocument): Promise<string> {
  const [challenger, target, winner] = await Promise.all([
    getUserByTelegramId(entry.challenger_telegram_id),
    getUserByTelegramId(entry.target_telegram_id),
    getUserByTelegramId(entry.winner_telegram_id),
  ]);
  const loserTelegramId =
    entry.winner_telegram_id === entry.challenger_telegram_id
      ? entry.target_telegram_id
      : entry.challenger_telegram_id;
  const loser = loserTelegramId === entry.target_telegram_id ? target : challenger;

  return `⚔️ ${userLabel(challenger)} vs ${userLabel(target)} → 🏆 ${userLabel(winner)} забрав ${entry.delta} см у ${userLabel(loser)}`;
}

export async function handleDuelHistoryCommand(ctx: Context): Promise<void> {
  const chat = ctx.chat;
  if (!chat) {
    return;
  }

  const history = await getChatDuelHistory(chat.id);
  if (history.length === 0) {
    await ctx.reply('⚔️ У цьому чаті ще не було жодної дуелі.');
    return;
  }

  const lines = await Promise.all(history.map(formatDuelLine));
  await replyWithMenu(ctx, `⚔️ Історія дуелей цього чату:\n${lines.join('\n')}`);
}

export async function handleDuelHistoryMeAction(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) {
    return;
  }

  const history = await getPersonalDuelHistory(from.id);
  if (history.length === 0) {
    await ctx.answerCbQuery();
    await ctx.reply('⚔️ У тебе ще не було жодної дуелі.');
    return;
  }

  const lines = await Promise.all(history.map(formatDuelLine));
  await ctx.answerCbQuery();
  await ctx.reply(`⚔️ Твоя історія дуелей:\n${lines.join('\n')}`);
}
