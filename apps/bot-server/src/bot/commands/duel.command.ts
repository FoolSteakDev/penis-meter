import type { Context } from 'telegraf';
import { Markup } from 'telegraf';
import type { InlineKeyboardButton } from 'telegraf/typings/core/types/typegram';
import { DUEL_OPPONENTS_PER_PAGE, DUEL_STAKE_INPUT_MAX_ATTEMPTS } from '../../config/constants';
import type { DuelChallengeHydratedDocument } from '../../database/models/duel-challenge.model';
import {
  cancelChallenge,
  computeAutoStake,
  createDraftChallenge,
  declineChallenge,
  deleteUndeliveredChallenge,
  discardDraft,
  finalizeChallenge,
  findDraftByStakePrompt,
  getChallengeById,
  getDuelSettings,
  getStakeBounds,
  listDuelOpponents,
  parseStakeInput,
  recordChallengeInvite,
  recordFlowMessage,
  recordStakePrompt,
  resolveChallenge,
  type StakeBounds,
} from '../../services/duel.service';
import { findOrCreateUser, getUserByTelegramId } from '../../services/user.service';
import { formatKyivTime } from '../../utils/date.util';
import { userLabel } from '../../utils/user-label.util';
import { hasReliableMention, mentionHtml } from '../utils/mention.util';
import { safeDeleteMessages } from '../utils/message-cleanup.util';
import { formatCm } from '../../utils/number.util';

/**
 * Скільки разів гравець невдало ввів ставку для конкретної чернетки -
 * ефемерне, у пам'яті процесу (як і chat-activity.service.ts): чернетки
 * живуть хвилини, рестарт процесу все одно скидає незавершений флоу.
 */
const stakeInputAttempts = new Map<string, number>();

/** draftId -> id службових повідомлень (⚠️-попередження тощо), які треба прибрати наприкінці флоу. */
const flowScratchMessages = new Map<string, number[]>();

async function userLabelByTelegramId(telegramId: number): Promise<string> {
  return userLabel(await getUserByTelegramId(telegramId));
}

function getCallbackData(ctx: Context): string | null {
  const query = ctx.callbackQuery;
  return query && 'data' in query ? query.data : null;
}

function inviteKeyboard(challengeId: string) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ Прийняти', `d:acc:${challengeId}`),
      Markup.button.callback('❌ Відхилити', `d:dec:${challengeId}`),
    ],
    [Markup.button.callback('🚫 Скасувати', `d:cancel:${challengeId}`)],
  ]);
}

/** Крок 1: список опонентів, відсортований за value спадно, посторінково. */
async function buildOpponentPickerView(
  chatId: number,
  challengerTelegramId: number,
  page: number,
): Promise<{ text: string; markup: ReturnType<typeof Markup.inlineKeyboard> } | null> {
  const opponents = await listDuelOpponents(chatId, challengerTelegramId);
  if (opponents.length === 0) {
    return null;
  }

  const sorted = [...opponents].sort((a, b) => b.value - a.value);
  const totalPages = Math.max(1, Math.ceil(sorted.length / DUEL_OPPONENTS_PER_PAGE));
  const clampedPage = Math.min(Math.max(page, 0), totalPages - 1);
  const pageItems = sorted.slice(clampedPage * DUEL_OPPONENTS_PER_PAGE, (clampedPage + 1) * DUEL_OPPONENTS_PER_PAGE);

  const buttons: InlineKeyboardButton.CallbackButton[] = pageItems.map((opponent) =>
    Markup.button.callback(
      `${userLabel(opponent)} · ${formatCm(opponent.value)} см`,
      `d:pick:${challengerTelegramId}:${opponent.telegram_id}`,
    ),
  );
  const rows: InlineKeyboardButton.CallbackButton[][] = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }

  if (totalPages > 1) {
    const navRow: InlineKeyboardButton.CallbackButton[] = [];
    if (clampedPage > 0) {
      navRow.push(Markup.button.callback('◀️', `d:page:${challengerTelegramId}:${clampedPage - 1}`));
    }
    if (clampedPage < totalPages - 1) {
      navRow.push(Markup.button.callback('▶️', `d:page:${challengerTelegramId}:${clampedPage + 1}`));
    }
    rows.push(navRow);
  }

  const text =
    totalPages > 1
      ? `⚔️ Кого викликаєш на дуель? (сторінка ${clampedPage + 1}/${totalPages})`
      : '⚔️ Кого викликаєш на дуель?';

  return { text, markup: Markup.inlineKeyboard(rows) };
}

/** Крок 2: опонента обрано, обираємо ставку (авто чи власну). */
async function renderStakeStep(
  ctx: Context,
  draftId: string,
  challengerTelegramId: number,
  targetTelegramId: number,
): Promise<void> {
  const [target, bounds] = await Promise.all([
    getUserByTelegramId(targetTelegramId),
    getStakeBounds(challengerTelegramId, targetTelegramId),
  ]);

  await ctx.editMessageText(
    `⚔️ Опонент: ${userLabel(target)}. Обери ставку (від ${formatCm(bounds.min)} до ${formatCm(bounds.max)} см):`,
    Markup.inlineKeyboard([
      [Markup.button.callback('🎲 Авто', `d:auto:${draftId}`), Markup.button.callback('✍️ Своя', `d:cust:${draftId}`)],
      [Markup.button.callback('◀️ Назад', `d:back:${draftId}`)],
    ]),
  );
}

/** Надсилає повідомлення B (сам виклик) у чат і записує invite_chat_id/invite_message_id. */
async function sendChallengeInviteMessage(
  telegram: Context['telegram'],
  chatId: number,
  finalized: DuelChallengeHydratedDocument,
): Promise<{ target: Awaited<ReturnType<typeof getUserByTelegramId>> }> {
  const [challenger, target] = await Promise.all([
    getUserByTelegramId(finalized.challenger_telegram_id),
    getUserByTelegramId(finalized.target_telegram_id),
  ]);
  if (!challenger || !target) {
    throw new Error('Одного з учасників дуелі більше не знайдено');
  }

  const deadline = formatKyivTime(finalized.expires_at);
  // finalized завжди пройшов finalizeChallenge, тож stake тут вже не null (тип number | null - лише для draft-стадії).
  const text = `⚔️ ${mentionHtml(challenger)} викликає на дуель ${mentionHtml(target)}!\n💰 Ставка: ${formatCm(finalized.stake as number)} см\n⏳ Відповісти можна до ${deadline} за Києвом`;

  const sent = await telegram.sendMessage(chatId, text, {
    parse_mode: 'HTML',
    ...inviteKeyboard(finalized.id),
  });
  await recordChallengeInvite(finalized.id, chatId, sent.message_id);

  return { target };
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

  const view = await buildOpponentPickerView(chat.id, from.id, 0);
  if (!view) {
    await ctx.reply('⚔️ У цьому чаті поки немає з ким дуелитись - хай ще хтось скористається ботом тут.');
    return;
  }

  await ctx.reply(view.text, view.markup);
}

export async function handleDuelPageAction(ctx: Context): Promise<void> {
  const data = getCallbackData(ctx);
  const from = ctx.from;
  const chat = ctx.chat;
  if (!data || !from || !chat) {
    return;
  }

  const match = /^d:page:(\d+):(\d+)$/.exec(data);
  if (!match) {
    return;
  }
  const challengerTelegramId = Number(match[1]);
  const page = Number(match[2]);

  if (from.id !== challengerTelegramId) {
    await ctx.answerCbQuery('Ця кнопка не для тебе', { show_alert: true });
    return;
  }

  const view = await buildOpponentPickerView(chat.id, challengerTelegramId, page);
  if (!view) {
    await ctx.answerCbQuery('Список порожній', { show_alert: true });
    return;
  }

  await ctx.editMessageText(view.text, view.markup);
  await ctx.answerCbQuery();
}

export async function handleDuelPickAction(ctx: Context): Promise<void> {
  const data = getCallbackData(ctx);
  const from = ctx.from;
  const chat = ctx.chat;
  if (!data || !from || !chat) {
    return;
  }

  const match = /^d:pick:(\d+):(\d+)$/.exec(data);
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
    const draft = await createDraftChallenge(chat.id, challengerTelegramId, targetTelegramId);
    const flowMessageId = ctx.callbackQuery?.message?.message_id;
    if (flowMessageId) {
      await recordFlowMessage(draft.id, flowMessageId);
    }
    await renderStakeStep(ctx, draft.id, challengerTelegramId, targetTelegramId);
    await ctx.answerCbQuery();
  } catch (error) {
    await ctx.answerCbQuery(error instanceof Error ? error.message : 'Не вдалось обрати опонента', {
      show_alert: true,
    });
  }
}

export async function handleDuelBackAction(ctx: Context): Promise<void> {
  const data = getCallbackData(ctx);
  const from = ctx.from;
  const chat = ctx.chat;
  if (!data || !from || !chat) {
    return;
  }

  const match = /^d:back:([a-f0-9]{24})$/.exec(data);
  if (!match) {
    return;
  }
  const draftId = match[1];

  await discardDraft(draftId, from.id);
  stakeInputAttempts.delete(draftId);
  flowScratchMessages.delete(draftId);

  const view = await buildOpponentPickerView(chat.id, from.id, 0);
  if (!view) {
    await ctx.editMessageText('⚔️ У цьому чаті поки немає з ким дуелитись - хай ще хтось скористається ботом тут.');
    await ctx.answerCbQuery();
    return;
  }

  await ctx.editMessageText(view.text, view.markup);
  await ctx.answerCbQuery();
}

export async function handleDuelAutoStakeAction(ctx: Context): Promise<void> {
  const data = getCallbackData(ctx);
  const from = ctx.from;
  const chat = ctx.chat;
  if (!data || !from || !chat) {
    return;
  }

  const match = /^d:auto:([a-f0-9]{24})$/.exec(data);
  if (!match) {
    return;
  }
  const draftId = match[1];

  const draft = await getChallengeById(draftId);
  if (!draft || draft.status !== 'draft') {
    await ctx.answerCbQuery('Ця чернетка виклику вже неактуальна - почни заново через /duel', { show_alert: true });
    return;
  }
  if (draft.challenger_telegram_id !== from.id) {
    await ctx.answerCbQuery('Ця дія не для тебе', { show_alert: true });
    return;
  }

  let finalized: DuelChallengeHydratedDocument;
  try {
    const stake = await computeAutoStake(draft.challenger_telegram_id, draft.target_telegram_id);
    finalized = await finalizeChallenge(draftId, from.id, stake);
  } catch (error) {
    await ctx.answerCbQuery(error instanceof Error ? error.message : 'Не вдалось створити виклик', {
      show_alert: true,
    });
    return;
  }

  try {
    const { target } = await sendChallengeInviteMessage(ctx.telegram, chat.id, finalized);
    stakeInputAttempts.delete(draftId);
    await safeDeleteMessages(ctx.telegram, chat.id, [
      draft.flow_message_id ?? ctx.callbackQuery?.message?.message_id,
      ...(flowScratchMessages.get(draftId) ?? []),
    ]);
    flowScratchMessages.delete(draftId);

    if (target && !hasReliableMention(target)) {
      await ctx.answerCbQuery('Опонент без @username - сповіщення може не прийти, штовхни його в чаті', {
        show_alert: true,
      });
    } else {
      await ctx.answerCbQuery();
    }
  } catch (error) {
    await deleteUndeliveredChallenge(finalized.id);
    console.error(`[duel] failed to deliver auto-stake invite for challenge ${finalized.id}`, error);
    await ctx.answerCbQuery('Не вдалось надіслати виклик у чат - спробуй ще раз', { show_alert: true });
  }
}

export async function handleDuelCustomStakeAction(ctx: Context): Promise<void> {
  const data = getCallbackData(ctx);
  const from = ctx.from;
  const chat = ctx.chat;
  if (!data || !from || !chat) {
    return;
  }

  const match = /^d:cust:([a-f0-9]{24})$/.exec(data);
  if (!match) {
    return;
  }
  const draftId = match[1];

  const draft = await getChallengeById(draftId);
  if (!draft || draft.status !== 'draft') {
    await ctx.answerCbQuery('Ця чернетка виклику вже неактуальна - почни заново через /duel', { show_alert: true });
    return;
  }
  if (draft.challenger_telegram_id !== from.id) {
    await ctx.answerCbQuery('Ця дія не для тебе', { show_alert: true });
    return;
  }

  try {
    const [bounds, challenger] = await Promise.all([
      getStakeBounds(draft.challenger_telegram_id, draft.target_telegram_id),
      getUserByTelegramId(draft.challenger_telegram_id),
    ]);
    if (!challenger) {
      throw new Error('Тебе більше не знайдено серед відомих боту');
    }

    // selective + меншн - ForceReply примусово відкриється лише у викликача,
    // решта чату його не побачить.
    const prompt = await ctx.telegram.sendMessage(
      chat.id,
      `✍️ ${mentionHtml(challenger)}, введи ставку в см (від ${formatCm(bounds.min)} до ${formatCm(bounds.max)}):`,
      { parse_mode: 'HTML', reply_markup: { force_reply: true, selective: true } },
    );
    await recordStakePrompt(draftId, prompt.message_id);
    stakeInputAttempts.set(draftId, 0);
    await ctx.answerCbQuery();
  } catch (error) {
    await ctx.answerCbQuery(error instanceof Error ? error.message : 'Не вдалось запросити ставку', {
      show_alert: true,
    });
  }
}

/**
 * Ловить текстову відповідь на ForceReply-підказку "введи ставку". Має бути
 * зареєстрований у bot.ts ДО registerMenuButtons - інакше ранній return
 * next() тут не врятує reply-кнопки меню, бо ловилось б навпаки. Коли
 * повідомлення не є відповіддю на активну чернетку - одразу next(), щоб не
 * зламати ані меню, ані звичайне спілкування в чаті.
 */
export async function handleDuelStakeReply(ctx: Context, next: () => Promise<void>): Promise<void> {
  const message = ctx.message;
  const chat = ctx.chat;
  const from = ctx.from;
  if (!message || !('text' in message) || !chat || !from) {
    return next();
  }

  const replyToId = message.reply_to_message?.message_id;
  if (!replyToId) {
    return next();
  }

  const draft = await findDraftByStakePrompt(replyToId);
  if (!draft || draft.challenger_telegram_id !== from.id) {
    return next();
  }

  const parsed = parseStakeInput(message.text);
  const bounds: StakeBounds | null = await getStakeBounds(
    draft.challenger_telegram_id,
    draft.target_telegram_id,
  ).catch(() => null);

  if (parsed === null || bounds === null || parsed < bounds.min || parsed > bounds.max) {
    const attempts = (stakeInputAttempts.get(draft.id) ?? 0) + 1;
    stakeInputAttempts.set(draft.id, attempts);

    if (attempts >= DUEL_STAKE_INPUT_MAX_ATTEMPTS) {
      await discardDraft(draft.id, from.id);
      stakeInputAttempts.delete(draft.id);
      await safeDeleteMessages(ctx.telegram, chat.id, [
        draft.flow_message_id,
        replyToId,
        message.message_id,
        ...(flowScratchMessages.get(draft.id) ?? []),
      ]);
      flowScratchMessages.delete(draft.id);
      await ctx.reply('⚔️ Забагато невдалих спроб - виклик скасовано. Спробуй ще раз через /duel.');
      return;
    }

    const rangeText = bounds ? `від ${formatCm(bounds.min)} до ${formatCm(bounds.max)}` : 'у допустимих межах';
    const warn = await ctx.reply(`⚠️ Введи число ${rangeText} см (спроба ${attempts}/${DUEL_STAKE_INPUT_MAX_ATTEMPTS}).`);
    flowScratchMessages.set(draft.id, [...(flowScratchMessages.get(draft.id) ?? []), warn.message_id, message.message_id]);
    return;
  }

  let finalized: DuelChallengeHydratedDocument;
  try {
    finalized = await finalizeChallenge(draft.id, from.id, parsed);
  } catch (error) {
    await ctx.reply(error instanceof Error ? error.message : 'Не вдалось створити виклик');
    return;
  }
  stakeInputAttempts.delete(draft.id);

  try {
    const { target } = await sendChallengeInviteMessage(ctx.telegram, chat.id, finalized);
    if (target && !hasReliableMention(target)) {
      await ctx.reply('⚠️ Опонент без @username - сповіщення може не прийти, штовхни його в чаті.');
    }
  } catch (error) {
    await deleteUndeliveredChallenge(finalized.id);
    console.error(`[duel] failed to deliver custom-stake invite for challenge ${finalized.id}`, error);
    await ctx.reply('Не вдалось надіслати виклик у чат - спробуй ще раз.');
    return;
  }

  await safeDeleteMessages(ctx.telegram, chat.id, [
    draft.flow_message_id,
    replyToId,
    message.message_id,
    ...(flowScratchMessages.get(draft.id) ?? []),
  ]);
  flowScratchMessages.delete(draft.id);
}

export async function handleDuelAcceptAction(ctx: Context): Promise<void> {
  const data = getCallbackData(ctx);
  const from = ctx.from;
  if (!data || !from) {
    return;
  }

  const match = /^d:acc:([a-f0-9]{24})$/.exec(data);
  if (!match) {
    return;
  }

  try {
    const result = await resolveChallenge(match[1], from.id);
    const [winnerLabel, loserLabel] = await Promise.all([
      userLabelByTelegramId(result.winnerTelegramId),
      userLabelByTelegramId(result.loserTelegramId),
    ]);

    const questNote = result.questReward ? `\n🎯 Квест виконано! Бонус: +${formatCm(result.questReward)} см` : '';
    const reducedNote = result.stakeReduced
      ? ` (ставку зменшено до ${formatCm(result.amount)} см - у програвшого не вистачило)`
      : '';
    // Кламп об межу режиму (4.2) - окрема примітка, не мовчки: списано менше за amount.
    const clampedNote =
      result.loserApplied < result.amount
        ? `\n🛑 ${loserLabel} уперся в межу режиму - списано лише ${formatCm(result.loserApplied)} см замість ${formatCm(result.amount)}.`
        : '';
    await ctx.editMessageText(
      `⚔️ Дуель завершена! ${winnerLabel} переміг і забрав ${formatCm(result.amount)} см у ${loserLabel}!${reducedNote}\n📊 ${winnerLabel}: ${formatCm(result.winnerValue)} см · ${loserLabel}: ${formatCm(result.loserValue)} см${clampedNote}${questNote}`,
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

  const match = /^d:dec:([a-f0-9]{24})$/.exec(data);
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

/** Кнопки в старих повідомленнях (до переходу на короткі d:* префікси) - просимо почати заново. */
export async function handleOutdatedDuelAction(ctx: Context): Promise<void> {
  await ctx.answerCbQuery('Цей виклик застарів - почни заново через /duel', { show_alert: true });
}
