import type { Context } from 'telegraf';
import { Markup } from 'telegraf';
import { replyWithMenu } from '../keyboards/menu.keyboard';
import { withActor } from '../utils/actor.util';
import { QuestModel, type QuestCategory, type QuestHydratedDocument } from '../../database/models/quest.model';
import type { QuestSettingsHydratedDocument } from '../../database/models/quest-settings.model';
import type { QuestAssignmentHydratedDocument } from '../../database/models/quest-assignment.model';
import type { UserDocument } from '../../database/models/user.model';
import { buildQuestStartText } from '../../quests/quest-announce';
import { getQuestSettings } from '../../quests/quest-settings.service';
import {
  acceptQuest,
  cancelQuest,
  getActiveAssignmentById,
  getQuestSummary,
  listQuestOffers,
  recordQuestChatMessage,
  type QuestOffer,
  type QuestSummary,
} from '../../quests/quest.service';
import { QUEST_CATEGORY_LABELS, QUEST_CATEGORY_ORDER } from '../../quests/quest.types';
import { getUserByTelegramId } from '../../services/user.service';
import { formatKyivDateTime } from '../../utils/date.util';
import { formatCm, formatCmSigned, roundCm } from '../../utils/number.util';
import { userLabel } from '../../utils/user-label.util';

function getCallbackData(ctx: Context): string | null {
  const query = ctx.callbackQuery;
  return query && 'data' in query ? query.data : null;
}

/** «7 днів» / «48 год» / «6 год 30 хв» — для таймера й кулдауну на екрані підтвердження. */
function formatDuration(totalMinutes: number): string {
  if (totalMinutes >= 24 * 60 && totalMinutes % (24 * 60) === 0) {
    const days = totalMinutes / (24 * 60);
    return `${days} ${days === 1 ? 'день' : 'днів'}`;
  }
  if (totalMinutes % 60 === 0) {
    return `${totalMinutes / 60} год`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours} год ${minutes} хв` : `${minutes} хв`;
}

/** «41 год 12 хв» — зворотний відлік до дедлайну активного квесту. */
function formatCountdown(until: Date): string {
  const diffMinutes = Math.max(0, Math.round((until.getTime() - Date.now()) / 60000));
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  return `${hours} год ${String(minutes).padStart(2, '0')} хв`;
}

function buildActiveQuestLine(assignment: QuestAssignmentHydratedDocument): string {
  const { snapshot } = assignment;
  const countdown = formatCountdown(assignment.expires_at);
  const detail =
    snapshot.kind === 'reach'
      ? `${assignment.hit_keys.length > 0 ? assignment.hit_keys.length : assignment.progress} / ${snapshot.target} · ${snapshot.description}`
      : snapshot.description;
  return `${snapshot.emoji} ${snapshot.name} — ⏳ ${countdown}\n   ${detail}`;
}

interface QuestView {
  text: string;
  markup: ReturnType<typeof Markup.inlineKeyboard>;
}

export function buildSummaryView(user: UserDocument, summary: QuestSummary, telegramId: number): QuestView {
  const lines = [
    `🧭 Квести — ${userLabel(user)}`,
    `Активні: ${summary.activeAssignments.length} · Виконано: ${summary.completedCount} · Провалено: ${summary.failedCount} · Баланс: ${formatCmSigned(summary.balanceCm)} см`,
  ];

  if (summary.activeAssignments.length > 0) {
    lines.push('');
    for (const assignment of summary.activeAssignments) {
      lines.push(buildActiveQuestLine(assignment));
    }
  }

  lines.push('', 'Обери категорію:');

  const buttons: ReturnType<typeof Markup.button.callback>[][] = [];
  for (let i = 0; i < QUEST_CATEGORY_ORDER.length; i += 2) {
    const row = QUEST_CATEGORY_ORDER.slice(i, i + 2).map((category) => {
      const p = summary.categoryProgress[category];
      return Markup.button.callback(
        `${QUEST_CATEGORY_LABELS[category]} ${p.completedDistinct}/${p.total}`,
        `q:c:${category}:${telegramId}`,
      );
    });
    buttons.push(row);
  }

  for (const assignment of summary.activeAssignments) {
    buttons.push([
      Markup.button.callback(
        `❌ Здатись — ${assignment.snapshot.emoji} ${assignment.snapshot.name} (−${formatCm(assignment.snapshot.penalty_cm)} см)`,
        `q:x:${assignment.id}`,
      ),
    ]);
  }

  return { text: lines.join('\n').trimEnd(), markup: Markup.inlineKeyboard(buttons) };
}

export function buildCategoryView(category: QuestCategory, offers: QuestOffer[], telegramId: number): QuestView {
  const lines = [QUEST_CATEGORY_LABELS[category], ''];
  const buttons: ReturnType<typeof Markup.button.callback>[][] = [];

  for (const { quest, blockedReason } of offers) {
    lines.push(`${quest.emoji} ${quest.name}${blockedReason ? ` (${blockedReason})` : ''}`);
    if (!blockedReason) {
      buttons.push([Markup.button.callback(`${quest.emoji} ${quest.name}`, `q:p:${quest.code}:${telegramId}`)]);
    }
  }
  if (offers.length === 0) {
    lines.push('Квестів у цій категорії поки немає.');
  }

  buttons.push([Markup.button.callback('⬅️ Назад', `q:back:${telegramId}`)]);

  return { text: lines.join('\n'), markup: Markup.inlineKeyboard(buttons) };
}

export function buildConfirmView(
  quest: QuestHydratedDocument,
  settings: QuestSettingsHydratedDocument,
  telegramId: number,
): QuestView {
  const reward = roundCm(quest.reward_cm * settings.reward_multiplier);
  const penalty = roundCm(quest.penalty_cm * settings.penalty_multiplier);
  const deadline = formatKyivDateTime(new Date(Date.now() + quest.duration_minutes * 60 * 1000));

  const lines = [
    `${quest.emoji} ${quest.name}`,
    '',
    quest.description,
    '',
    `⏳ Таймер: ${formatDuration(quest.duration_minutes)} (до ${deadline})`,
    `🎁 Нагорода: +${formatCm(reward)} см`,
    `💀 Штраф за провал: −${formatCm(penalty)} см`,
    `🔁 Повторно: через ${formatDuration(quest.cooldown_hours * 60)} після закриття`,
  ];

  const markup = Markup.inlineKeyboard([
    [Markup.button.callback('✅ Взяти квест', `q:go:${quest.code}:${telegramId}`)],
    [Markup.button.callback('⬅️ Назад', `q:c:${quest.category}:${telegramId}`)],
  ]);

  return { text: lines.join('\n'), markup };
}

async function respond(ctx: Context, telegramId: number, text: string, markup: ReturnType<typeof Markup.inlineKeyboard>): Promise<void> {
  const from = ctx.from;
  // Чуже повідомлення редагувати не можна (як у achievements.command.ts).
  if (from && from.id === telegramId) {
    await ctx.editMessageText(withActor(ctx, text), markup);
  } else {
    await ctx.reply(withActor(ctx, text), markup);
  }
}

/** bot.command('quests', ...) і MENU_HANDLERS.quest - головний екран. */
export async function handleQuestsCommand(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  const settings = await getQuestSettings();
  if (!settings.is_enabled) {
    await replyWithMenu(ctx, '🧭 Квести зараз тимчасово вимкнено.');
    return;
  }

  const user = await getUserByTelegramId(from.id);
  if (!user) return;

  const summary = await getQuestSummary(from.id);
  const { text, markup } = buildSummaryView(user, summary, from.id);
  await replyWithMenu(ctx, text, markup);
}

/** bot.action(/^q:back:\d+$/, ...) */
export async function handleQuestsBackAction(ctx: Context): Promise<void> {
  const match = /^q:back:(\d+)$/.exec(getCallbackData(ctx) ?? '');
  if (!match) return;
  const telegramId = Number(match[1]);

  const user = await getUserByTelegramId(telegramId);
  if (!user) {
    await ctx.answerCbQuery();
    return;
  }

  const summary = await getQuestSummary(telegramId);
  const { text, markup } = buildSummaryView(user, summary, telegramId);
  await respond(ctx, telegramId, text, markup);
  await ctx.answerCbQuery();
}

/** bot.action(/^q:c:\w+:\d+$/, ...) */
export async function handleQuestsCategoryAction(ctx: Context): Promise<void> {
  const match = /^q:c:(\w+):(\d+)$/.exec(getCallbackData(ctx) ?? '');
  if (!match) return;
  const category = match[1] as QuestCategory;
  const telegramId = Number(match[2]);
  if (!QUEST_CATEGORY_ORDER.includes(category)) {
    await ctx.answerCbQuery();
    return;
  }

  const offers = await listQuestOffers(telegramId);
  const inCategory = offers.filter((offer) => offer.quest.category === category);
  const { text, markup } = buildCategoryView(category, inCategory, telegramId);
  await respond(ctx, telegramId, text, markup);
  await ctx.answerCbQuery();
}

/** bot.action(/^q:p:[a-z][a-z0-9_]{1,23}:\d+$/, ...) - екран підтвердження. */
export async function handleQuestsConfirmAction(ctx: Context): Promise<void> {
  const match = /^q:p:([a-z][a-z0-9_]{1,23}):(\d+)$/.exec(getCallbackData(ctx) ?? '');
  if (!match) return;
  const code = match[1];
  const telegramId = Number(match[2]);

  const [quest, settings] = await Promise.all([QuestModel.findOne({ code, is_enabled: true }), getQuestSettings()]);
  if (!quest) {
    await ctx.answerCbQuery('Цей квест зараз недоступний', { show_alert: true });
    return;
  }

  const { text, markup } = buildConfirmView(quest, settings, telegramId);
  await respond(ctx, telegramId, text, markup);
  await ctx.answerCbQuery();
}

/** bot.action(/^q:go:[a-z][a-z0-9_]{1,23}:\d+$/, ...) - взяття квесту. Строго власник (6.3 плану). */
export async function handleQuestsAcceptAction(ctx: Context): Promise<void> {
  const from = ctx.from;
  const match = /^q:go:([a-z][a-z0-9_]{1,23}):(\d+)$/.exec(getCallbackData(ctx) ?? '');
  if (!match || !from) return;
  const code = match[1];
  const telegramId = Number(match[2]);

  if (from.id !== telegramId) {
    await ctx.answerCbQuery('Це не твій квест', { show_alert: true });
    return;
  }

  const chat = ctx.chat;
  if (!chat) {
    await ctx.answerCbQuery();
    return;
  }

  const result = await acceptQuest(telegramId, code, chat.id);
  if ('error' in result) {
    await ctx.answerCbQuery(result.error, { show_alert: true });
    return;
  }

  const user = await getUserByTelegramId(telegramId);
  if (!user) {
    await ctx.answerCbQuery();
    return;
  }

  // Повідомлення з підтвердженням стає публічним анонсом старту (5.2 плану) -
  // groupmates вже бачать цей чат, окреме дублювання зайве.
  const text = buildQuestStartText(user, result.assignment);
  await ctx.editMessageText(withActor(ctx, text));

  const callbackQuery = ctx.callbackQuery;
  const messageId = callbackQuery && 'message' in callbackQuery ? callbackQuery.message?.message_id ?? null : null;
  if (messageId !== null) {
    await recordQuestChatMessage(result.assignment.id, messageId);
  }

  await ctx.answerCbQuery('Квест узято!');
}

/** bot.action(/^q:x:[a-f0-9]{24}$/, ...) - екран підтвердження здачі. */
export async function handleQuestsCancelPromptAction(ctx: Context): Promise<void> {
  const from = ctx.from;
  const match = /^q:x:([a-f0-9]{24})$/.exec(getCallbackData(ctx) ?? '');
  if (!match || !from) return;
  const assignmentId = match[1];

  const assignment = await getActiveAssignmentById(assignmentId);
  if (!assignment) {
    await ctx.answerCbQuery('Цей квест уже неактивний', { show_alert: true });
    return;
  }
  if (assignment.telegram_id !== from.id) {
    await ctx.answerCbQuery('Це не твій квест', { show_alert: true });
    return;
  }

  const markup = Markup.inlineKeyboard([
    [
      Markup.button.callback(
        `❌ Здатись (−${formatCm(assignment.snapshot.penalty_cm)} см)`,
        `q:xy:${assignmentId}`,
      ),
    ],
    [Markup.button.callback('⬅️ Назад', `q:back:${from.id}`)],
  ]);
  await ctx.editMessageText(
    withActor(ctx, `Здатись на квесті «${assignment.snapshot.emoji} ${assignment.snapshot.name}»? Штраф застосується повністю.`),
    markup,
  );
  await ctx.answerCbQuery();
}

/** bot.action(/^q:xy:[a-f0-9]{24}$/, ...) - фактична здача. Строго власник (6.3 плану). */
export async function handleQuestsCancelConfirmAction(ctx: Context): Promise<void> {
  const from = ctx.from;
  const match = /^q:xy:([a-f0-9]{24})$/.exec(getCallbackData(ctx) ?? '');
  if (!match || !from) return;
  const assignmentId = match[1];

  const assignment = await getActiveAssignmentById(assignmentId);
  if (!assignment || assignment.telegram_id !== from.id) {
    await ctx.answerCbQuery('Це не твій квест', { show_alert: true });
    return;
  }

  const result = await cancelQuest(from.id, assignmentId, ctx.telegram);
  if ('error' in result) {
    await ctx.answerCbQuery(result.error, { show_alert: true });
    return;
  }

  const user = await getUserByTelegramId(from.id);
  if (user) {
    const summary = await getQuestSummary(from.id);
    const { text, markup } = buildSummaryView(user, summary, from.id);
    await ctx.editMessageText(withActor(ctx, text), markup);
  }
  await ctx.answerCbQuery('Здався. Штраф списано.');
}
