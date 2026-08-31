import type { Context } from 'telegraf';
import { Markup } from 'telegraf';
import { replyWithMenu } from '../keyboards/menu.keyboard';
import { withActor } from '../utils/actor.util';
import { getOrCreateProgress } from '../../achievements/achievement-progress.service';
import { levelForValue, ROMAN } from '../../achievements/achievement.engine';
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_LEVELS,
  TOTAL_ACHIEVEMENT_LEVELS,
} from '../../achievements/achievement.registry';
import type { AchievementCategory, AchievementDefinition } from '../../achievements/achievement.types';
import { CATEGORY_LABELS } from '../../achievements/achievement.types';
import { getUserByTelegramId } from '../../services/user.service';
import type { AchievementProgressDocument } from '../../database/models/achievement-progress.model';
import type { UserDocument } from '../../database/models/user.model';
import { formatCm } from '../../utils/number.util';
import { userLabel } from '../../utils/user-label.util';

const CATEGORY_ORDER: AchievementCategory[] = ['measure', 'growth', 'duel', 'condition', 'social', 'meta'];

function getCallbackData(ctx: Context): string | null {
  const query = ctx.callbackQuery;
  return query && 'data' in query ? query.data : null;
}

function achievementsInCategory(category: AchievementCategory): AchievementDefinition[] {
  return ACHIEVEMENTS.filter((def) => def.category === category);
}

function levelOf(progress: AchievementProgressDocument, code: string): number {
  return progress.levels?.get(code) ?? 0;
}

function totalOpenedLevels(progress: AchievementProgressDocument): number {
  let sum = 0;
  for (const def of ACHIEVEMENTS) {
    sum += levelOf(progress, def.code);
  }
  return sum;
}

function categoryOpenedLevels(progress: AchievementProgressDocument, category: AchievementCategory): number {
  let sum = 0;
  for (const def of achievementsInCategory(category)) {
    sum += levelOf(progress, def.code);
  }
  return sum;
}

function formatMetricValue(unit: AchievementDefinition['unit'], value: number): string {
  if (unit === 'cm') return `${formatCm(value)} см`;
  if (unit === 'days') return `${Math.floor(value)} дн.`;
  return `${Math.floor(value)}`;
}

/** Другий рядок картки досягнення: прогрес до наступного рівня, або ✅ на максимумі. */
export function formatProgressLine(def: AchievementDefinition, level: number, value: number): string {
  if (level >= ACHIEVEMENT_LEVELS) {
    return `${formatMetricValue(def.unit, value)} ✅`;
  }
  const nextThreshold = def.thresholds[level];
  const nextReward = def.rewards[level];
  return `${formatMetricValue(def.unit, value)} / ${formatMetricValue(def.unit, nextThreshold)} → ${ROMAN[level + 1]} (+${formatCm(nextReward)} см)`;
}

interface AchievementsView {
  text: string;
  markup: ReturnType<typeof Markup.inlineKeyboard>;
}

export function buildSummaryView(
  user: UserDocument,
  progress: AchievementProgressDocument,
  telegramId: number,
): AchievementsView {
  const lines = [
    `🎖 Досягнення — ${userLabel(user)}`,
    `Відкрито рівнів: ${totalOpenedLevels(progress)} / ${TOTAL_ACHIEVEMENT_LEVELS}`,
    `Зароблено: +${formatCm(progress.awarded_cm)} см`,
    '',
    'Обери категорію:',
  ];

  const buttons = [];
  for (let i = 0; i < CATEGORY_ORDER.length; i += 2) {
    const row = CATEGORY_ORDER.slice(i, i + 2).map((category) => {
      const total = achievementsInCategory(category).length * ACHIEVEMENT_LEVELS;
      const opened = categoryOpenedLevels(progress, category);
      return Markup.button.callback(
        `${CATEGORY_LABELS[category]} ${opened}/${total}`,
        `a:c:${category}:${telegramId}`,
      );
    });
    buttons.push(row);
  }

  return { text: lines.join('\n'), markup: Markup.inlineKeyboard(buttons) };
}

export function buildCategoryView(
  user: UserDocument,
  progress: AchievementProgressDocument,
  category: AchievementCategory,
  telegramId: number,
): AchievementsView {
  const defs = achievementsInCategory(category);
  const blocks: string[] = [CATEGORY_LABELS[category], ''];

  for (const def of defs) {
    const value = def.value({ user, progress });
    const level = Math.max(levelOf(progress, def.code), levelForValue(def, value));
    const bar = '▰'.repeat(level) + '▱'.repeat(ACHIEVEMENT_LEVELS - level);
    const levelLabel = level > 0 ? ROMAN[level] : 'немає';

    blocks.push(`${bar} ${def.emoji} ${def.name} — ${levelLabel}`);
    blocks.push(`   ${formatProgressLine(def, level, value)}`);
    blocks.push('');
  }

  const markup = Markup.inlineKeyboard([[Markup.button.callback('⬅️ Назад', `a:back:${telegramId}`)]]);
  return { text: blocks.join('\n').trimEnd(), markup };
}

async function loadViewData(telegramId: number): Promise<{ user: UserDocument; progress: AchievementProgressDocument } | null> {
  const user = await getUserByTelegramId(telegramId);
  if (!user) return null;
  const progress = await getOrCreateProgress(telegramId);
  return { user, progress };
}

/** bot.command('achievements', ...) - головний екран зі зведенням і кнопками категорій. */
export async function handleAchievementsCommand(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  const data = await loadViewData(from.id);
  if (!data) return;

  const { text, markup } = buildSummaryView(data.user, data.progress, from.id);
  await replyWithMenu(ctx, text, markup);
}

/** bot.action(/^a:c:\w+:\d+$/, ...) - екран категорії. */
export async function handleAchievementsCategoryAction(ctx: Context): Promise<void> {
  const from = ctx.from;
  const match = /^a:c:(\w+):(\d+)$/.exec(getCallbackData(ctx) ?? '');
  if (!match || !from) return;

  const category = match[1] as AchievementCategory;
  const telegramId = Number(match[2]);
  if (!CATEGORY_ORDER.includes(category)) {
    await ctx.answerCbQuery();
    return;
  }

  const data = await loadViewData(telegramId);
  if (!data) {
    await ctx.answerCbQuery();
    return;
  }

  const { text, markup } = buildCategoryView(data.user, data.progress, category, telegramId);

  // Чуже повідомлення редагувати не можна - інакше результат побачить не той,
  // хто натиснув, а той, для кого будувалось повідомлення (withActor.util.ts).
  if (from.id === telegramId) {
    await ctx.editMessageText(withActor(ctx, text), markup);
  } else {
    await ctx.reply(withActor(ctx, text), markup);
  }
  await ctx.answerCbQuery();
}

/** bot.action(/^a:back:\d+$/, ...) - повернутись до зведення. */
export async function handleAchievementsBackAction(ctx: Context): Promise<void> {
  const from = ctx.from;
  const match = /^a:back:(\d+)$/.exec(getCallbackData(ctx) ?? '');
  if (!match || !from) return;

  const telegramId = Number(match[1]);
  const data = await loadViewData(telegramId);
  if (!data) {
    await ctx.answerCbQuery();
    return;
  }

  const { text, markup } = buildSummaryView(data.user, data.progress, telegramId);

  if (from.id === telegramId) {
    await ctx.editMessageText(withActor(ctx, text), markup);
  } else {
    await ctx.reply(withActor(ctx, text), markup);
  }
  await ctx.answerCbQuery();
}
