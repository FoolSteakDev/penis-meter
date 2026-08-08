import type { Context } from 'telegraf';
import { Markup } from 'telegraf';
import type { InlineKeyboardButton } from 'telegraf/typings/core/types/typegram';
import {
  createChallenge,
  declineChallenge,
  deleteUndeliveredChallenge,
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

function getCallbackData(ctx: Context): string | null {
  const query = ctx.callbackQuery;
  return query && 'data' in query ? query.data : null;
}

/** Юзер ще не писав боту в особисті - Telegram не дозволяє написати йому першим. */
function isCantInitiateChatError(error: unknown): boolean {
  const description = (error as { response?: { description?: string } })?.response?.description ?? '';
  return /bot was blocked|chat not found|user is deactivated/i.test(description);
}

async function replyStartBotInPrivate(ctx: Context, label: string): Promise<void> {
  const username = ctx.botInfo?.username;
  const hint = username
    ? `Напиши боту в особисті @${username} (натисни /start), а потім спробуй ще раз.`
    : 'Напиши боту в особисті (натисни /start), а потім спробуй ще раз.';
  await ctx.reply(`⚔️ Не вдалось написати ${label} в особисті. ${hint}`);
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
    Markup.button.callback(userLabel(opponent), `duel:invite:${from.id}:${opponent.telegram_id}:${chat.id}`),
  );
  const rows: InlineKeyboardButton.CallbackButton[][] = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }

  try {
    await ctx.telegram.sendMessage(from.id, '⚔️ Кого викликаєш на дуель?', Markup.inlineKeyboard(rows));
  } catch (error) {
    if (isCantInitiateChatError(error)) {
      await replyStartBotInPrivate(ctx, 'тобі');
      return;
    }
    throw error;
  }

  await ctx.reply('⚔️ Список суперників надіслано тобі в особисті повідомлення.');
}

export async function handleDuelInviteAction(ctx: Context): Promise<void> {
  const data = getCallbackData(ctx);
  const from = ctx.from;
  if (!data || !from) {
    return;
  }

  const match = /^duel:invite:(\d+):(\d+):(-?\d+)$/.exec(data);
  if (!match) {
    return;
  }
  const challengerTelegramId = Number(match[1]);
  const targetTelegramId = Number(match[2]);
  const chatId = Number(match[3]);

  if (from.id !== challengerTelegramId) {
    await ctx.answerCbQuery('Ця кнопка не для тебе', { show_alert: true });
    return;
  }

  try {
    const challenge = await createChallenge(chatId, challengerTelegramId, targetTelegramId);
    const [challengerLabel, targetLabel] = await Promise.all([
      userLabelByTelegramId(challengerTelegramId),
      userLabelByTelegramId(targetTelegramId),
    ]);

    try {
      await ctx.telegram.sendMessage(
        targetTelegramId,
        `⚔️ ${challengerLabel} викликає тебе на дуель!`,
        Markup.inlineKeyboard([
          [
            Markup.button.callback('✅ Прийняти', `duel:accept:${challenge.id}`),
            Markup.button.callback('❌ Відхилити', `duel:decline:${challenge.id}`),
          ],
        ]),
      );
    } catch (deliveryError) {
      await deleteUndeliveredChallenge(challenge.id);
      if (isCantInitiateChatError(deliveryError)) {
        await ctx.editMessageText(`⚔️ Не вдалось надіслати виклик ${targetLabel} в особисті.`);
        await replyStartBotInPrivate(ctx, targetLabel);
        await ctx.answerCbQuery();
        return;
      }
      throw deliveryError;
    }

    await ctx.editMessageText(`⚔️ Виклик надіслано ${targetLabel}. Очікуємо на відповідь...`);
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
    const resultText = `⚔️ Дуель завершена! ${winnerLabel} переміг і забрав ${result.amount} см у ${loserLabel}!${questNote}`;

    await ctx.editMessageText('⚔️ Дуель зіграна! Результат дивись у чаті.');
    await ctx.telegram.sendMessage(result.chatId, resultText);
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
    const challenge = await declineChallenge(match[1], from.id);
    await ctx.editMessageText('⚔️ Виклик на дуель відхилено.');
    await ctx.answerCbQuery();

    const targetLabel = await userLabelByTelegramId(challenge.target_telegram_id);
    await ctx.telegram
      .sendMessage(challenge.challenger_telegram_id, `❌ ${targetLabel} відхилив(ла) твій виклик на дуель.`)
      .catch(() => undefined);
  } catch (error) {
    await ctx.answerCbQuery(error instanceof Error ? error.message : 'Не вдалось відхилити виклик', {
      show_alert: true,
    });
  }
}
