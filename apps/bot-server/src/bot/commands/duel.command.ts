import type { Context } from 'telegraf';
import { Markup } from 'telegraf';
import type { InlineKeyboardButton } from 'telegraf/typings/core/types/typegram';
import {
  cancelChallenge,
  createChallenge,
  declineChallenge,
  deleteUndeliveredChallenge,
  getDuelSettings,
  listDuelOpponents,
  recordChallengeInvite,
  resolveChallenge,
} from '../../services/duel.service';
import { findOrCreateUser, getUserByTelegramId } from '../../services/user.service';
import { userLabel } from '../../utils/user-label.util';
import { hasReliableMention, mentionHtml } from '../utils/mention.util';

async function userLabelByTelegramId(telegramId: number): Promise<string> {
  return userLabel(await getUserByTelegramId(telegramId));
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

  // Окремо від надсилання в чат нижче: якщо ТУТ впаде (ліміт, дублікат,
  // дуелі вимкнено) - виклику в БД ще нема, нічого відкочувати не треба.
  let challenge;
  try {
    challenge = await createChallenge(chat.id, challengerTelegramId, targetTelegramId);
  } catch (error) {
    await ctx.answerCbQuery(error instanceof Error ? error.message : 'Не вдалось створити виклик', {
      show_alert: true,
    });
    return;
  }

  try {
    const [challenger, target] = await Promise.all([
      getUserByTelegramId(challengerTelegramId),
      getUserByTelegramId(targetTelegramId),
    ]);
    if (!challenger || !target) {
      throw new Error('Одного з учасників дуелі більше не знайдено');
    }

    // Завжди НОВЕ повідомлення (не editMessageText) - редагування не створює
    // сповіщення в Telegram, а саме сповіщення й вирішує проблему "не всім
    // приходить виклик".
    const sent = await ctx.telegram.sendMessage(
      chat.id,
      `⚔️ ${mentionHtml(challenger)} викликає на дуель ${mentionHtml(target)}!`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('✅ Прийняти', `duel:accept:${challenge.id}`),
            Markup.button.callback('❌ Відхилити', `duel:decline:${challenge.id}`),
          ],
          [Markup.button.callback('🚫 Скасувати', `d:cancel:${challenge.id}`)],
        ]),
      },
    );
    await recordChallengeInvite(challenge.id, chat.id, sent.message_id);

    // Косметичне (список опонентів -> "Виклик надіслано..."), не критичне
    // для доставки - падіння тут НЕ має відкочувати вже надісланий виклик.
    try {
      await ctx.editMessageText(`⚔️ Виклик надіслано ${userLabel(target)}. Очікуємо на відповідь...`);
    } catch (editError) {
      console.error(`[duel] failed to edit opponent-list message for challenge ${challenge.id}`, editError);
    }

    if (!hasReliableMention(target)) {
      await ctx.answerCbQuery('Опонент без @username - сповіщення може не прийти, штовхни його в чаті', {
        show_alert: true,
      });
    } else {
      await ctx.answerCbQuery();
    }
  } catch (error) {
    await deleteUndeliveredChallenge(challenge.id);
    console.error(
      `[duel] failed to deliver invite for challenge ${challenge.id} (chat ${chat.id}, target ${targetTelegramId})`,
      error,
    );
    await ctx.answerCbQuery('Не вдалось надіслати виклик у чат - спробуй ще раз', { show_alert: true });
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

export async function handleDuelCancelAction(ctx: Context): Promise<void> {
  const data = getCallbackData(ctx);
  const from = ctx.from;
  if (!data || !from) {
    return;
  }

  const match = /^d:cancel:([a-f0-9]{24})$/.exec(data);
  if (!match) {
    return;
  }

  try {
    await cancelChallenge(match[1], from.id);
    await ctx.editMessageText('🚫 Виклик скасовано.');
    await ctx.answerCbQuery();
  } catch (error) {
    await ctx.answerCbQuery(error instanceof Error ? error.message : 'Не вдалось скасувати виклик', {
      show_alert: true,
    });
  }
}
