import type { Context } from 'telegraf';
import { Markup } from 'telegraf';
import type { InlineKeyboardButton } from 'telegraf/typings/core/types/typegram';
import {
  createChallenge,
  declineChallenge,
  getDuelSettings,
  listDuelOpponents,
  resolveChallenge,
} from '../../services/duel.service';
import { findOrCreateUser, getUserByTelegramId } from '../../services/user.service';

const UNKNOWN_PLAYER_LABEL = 'Гравець';

function userLabel(u: { username: string | null | undefined; first_name: string }): string {
  return u.username ?? u.first_name;
}

async function userLabelByTelegramId(telegramId: number): Promise<string> {
  const user = await getUserByTelegramId(telegramId);
  return user ? userLabel(user) : UNKNOWN_PLAYER_LABEL;
}

function mentionHtml(telegramId: number, label: string): string {
  return `<a href="tg://user?id=${telegramId}">${label}</a>`;
}

function getCallbackData(ctx: Context): string | null {
  const query = ctx.callbackQuery;
  return query && 'data' in query ? query.data : null;
}

export async function handleDuelCommand(ctx: Context): Promise<void> {
  const from = ctx.from;
  const chat = ctx.chat;
  if (!from || !chat) {
    return;
  }

  await findOrCreateUser({
    telegramId: from.id,
    username: from.username ?? null,
    firstName: from.first_name,
  });

  const settings = await getDuelSettings();
  if (!settings.is_enabled) {
    await ctx.reply('⚔️ Дуелі зараз вимкнено адміністратором.');
    return;
  }

  const opponents = await listDuelOpponents(chat.id, from.id);
  if (opponents.length === 0) {
    await ctx.reply('⚔️ У цьому чаті поки немає з ким дуелитись - хай ще хтось скористається ботом тут.');
    return;
  }

  const buttons: InlineKeyboardButton.CallbackButton[] = opponents.map((opponent) =>
    Markup.button.callback(userLabel(opponent), `duel:invite:${from.id}:${opponent.telegram_id}`),
  );
  const rows: InlineKeyboardButton.CallbackButton[][] = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }

  await ctx.reply('⚔️ Кого викликаєш на дуель?', Markup.inlineKeyboard(rows));
}

export async function handleDuelInviteAction(ctx: Context): Promise<void> {
  const data = getCallbackData(ctx);
  const from = ctx.from;
  const chat = ctx.chat;
  if (!data || !from || !chat) {
    return;
  }

  const match = /^duel:invite:(\d+):(\d+)$/.exec(data);
  if (!match) {
    return;
  }
  const challengerTelegramId = Number(match[1]);
  const targetTelegramId = Number(match[2]);

  if (from.id !== challengerTelegramId) {
    await ctx.answerCbQuery('Ця кнопка не для тебе', { show_alert: true });
    return;
  }

  try {
    const challenge = await createChallenge(chat.id, challengerTelegramId, targetTelegramId);
    const [challengerLabel, targetLabel] = await Promise.all([
      userLabelByTelegramId(challengerTelegramId),
      userLabelByTelegramId(targetTelegramId),
    ]);

    await ctx.editMessageText(`⚔️ Виклик надіслано ${targetLabel}. Очікуємо на відповідь...`);
    await ctx.reply(
      `⚔️ ${mentionHtml(challengerTelegramId, challengerLabel)} викликає на дуель ${mentionHtml(targetTelegramId, targetLabel)}!`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('✅ Прийняти', `duel:accept:${challenge.id}`),
            Markup.button.callback('❌ Відхилити', `duel:decline:${challenge.id}`),
          ],
        ]),
      },
    );
    await ctx.answerCbQuery();
  } catch (error) {
    await ctx.answerCbQuery(error instanceof Error ? error.message : 'Не вдалось створити виклик', {
      show_alert: true,
    });
  }
}

export async function handleDuelAcceptAction(ctx: Context): Promise<void> {
  const data = getCallbackData(ctx);
  const from = ctx.from;
  if (!data || !from) {
    return;
  }

  const match = /^duel:accept:([a-f0-9]{24})$/.exec(data);
  if (!match) {
    return;
  }

  try {
    const result = await resolveChallenge(match[1], from.id);
    const [winnerLabel, loserLabel] = await Promise.all([
      userLabelByTelegramId(result.winnerTelegramId),
      userLabelByTelegramId(result.loserTelegramId),
    ]);

    const questNote = result.questReward ? `\n🎯 Квест виконано! Бонус: +${result.questReward} см` : '';
    await ctx.editMessageText(
      `⚔️ Дуель завершена! ${winnerLabel} переміг і забрав ${result.amount} см у ${loserLabel}!${questNote}`,
    );
    await ctx.answerCbQuery();
  } catch (error) {
    await ctx.answerCbQuery(error instanceof Error ? error.message : 'Не вдалось завершити дуель', {
      show_alert: true,
    });
  }
}

export async function handleDuelDeclineAction(ctx: Context): Promise<void> {
  const data = getCallbackData(ctx);
  const from = ctx.from;
  if (!data || !from) {
    return;
  }

  const match = /^duel:decline:([a-f0-9]{24})$/.exec(data);
  if (!match) {
    return;
  }

  try {
    await declineChallenge(match[1], from.id);
    await ctx.editMessageText('⚔️ Виклик на дуель відхилено.');
    await ctx.answerCbQuery();
  } catch (error) {
    await ctx.answerCbQuery(error instanceof Error ? error.message : 'Не вдалось відхилити виклик', {
      show_alert: true,
    });
  }
}
