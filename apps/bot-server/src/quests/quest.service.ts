import type { Telegram } from 'telegraf';
import { QuestModel, type QuestHydratedDocument, type QuestCategory } from '../database/models/quest.model';
import {
  QuestAssignmentModel,
  type QuestAssignmentDocument,
  type QuestAssignmentHydratedDocument,
} from '../database/models/quest-assignment.model';
import { UserModel, type UserDocument } from '../database/models/user.model';
import { AchievementProgressModel } from '../database/models/achievement-progress.model';
import { bumpAchievementCounters, getOrCreateProgress, safeBump } from '../achievements/achievement-progress.service';
import { safeSync } from '../achievements/achievement.service';
import { getBotInstance } from '../bot/bot-instance';
import { nowUtc } from '../utils/date.util';
import { modeSign } from '../utils/mode.util';
import { roundCm } from '../utils/number.util';
import { buildClampedValueUpdate } from '../utils/value-update.util';
import { announceQuestResolution } from './quest-announce';
import { applyEvent } from './quest.engine';
import type { QuestEvent } from './quest.events';
import { getQuestRule, type QuestStartContext } from './quest.rules';
import { getQuestSettings } from './quest-settings.service';
import { QUEST_CATEGORY_ORDER } from './quest.types';
import type { QuestSettingsHydratedDocument } from '../database/models/quest-settings.model';

export interface QuestOffer {
  quest: QuestHydratedDocument;
  /** null — можна брати. Інакше причина, чому кнопка неактивна. */
  blockedReason: string | null;
}

function formatHoursMinutes(untilMs: number): string {
  const diffMinutes = Math.max(0, Math.round((untilMs - Date.now()) / 60000));
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  if (hours === 0) return `${minutes} хв`;
  return `${hours} год ${minutes} хв`;
}

interface BlockedReasonParams {
  quest: QuestHydratedDocument;
  telegramId: number;
  chatId: number;
  user: UserDocument | null;
  isActive: boolean;
  lastResolvedAt: Date | null;
  activeCount: number;
  settings: QuestSettingsHydratedDocument;
}

/**
 * Причини блокування в порядку зі 3.1 плану. Спільна для listQuestOffers
 * (де chatId невідомий — квести не прив'язані до чату) і acceptQuest
 * (де chatId справжній, для precondition-правил, яким він знадобиться).
 */
async function computeBlockedReason(params: BlockedReasonParams): Promise<string | null> {
  const { quest, telegramId, chatId, user, isActive, lastResolvedAt, activeCount, settings } = params;

  if (isActive) {
    return 'вже взято';
  }

  if (lastResolvedAt && quest.cooldown_hours > 0) {
    const unlockAtMs = lastResolvedAt.getTime() + quest.cooldown_hours * 60 * 60 * 1000;
    if (unlockAtMs > Date.now()) {
      return `доступний через ${formatHoursMinutes(unlockAtMs)}`;
    }
  }

  if (settings.max_active_quests > 0 && activeCount >= settings.max_active_quests) {
    return 'ліміт активних квестів';
  }

  const rule = getQuestRule(quest.rule);
  if (rule?.precondition && user) {
    const reason = await rule.precondition({ telegramId, chatId, user });
    if (reason) return reason;
  }

  return null;
}

/** Один запит по активних + один агрегат останніх закриттів — не N+1 на список квестів. */
export async function listQuestOffers(telegramId: number): Promise<QuestOffer[]> {
  const [quests, user, settings, activeAssignments, lastResolvedAgg] = await Promise.all([
    QuestModel.find({ is_enabled: true }).sort({ category: 1, sort_order: 1 }),
    UserModel.findOne({ telegram_id: telegramId }),
    getQuestSettings(),
    QuestAssignmentModel.find({ telegram_id: telegramId, status: 'active' }),
    QuestAssignmentModel.aggregate<{ _id: string; lastResolvedAt: Date }>([
      { $match: { telegram_id: telegramId, status: { $in: ['completed', 'failed', 'cancelled'] } } },
      { $sort: { resolved_at: -1 } },
      { $group: { _id: '$quest_code', lastResolvedAt: { $first: '$resolved_at' } } },
    ]),
  ]);

  const activeCodes = new Set(activeAssignments.map((a) => a.quest_code));
  const lastResolvedByCode = new Map(lastResolvedAgg.map((r) => [r._id, r.lastResolvedAt]));

  const offers: QuestOffer[] = [];
  for (const quest of quests) {
    const blockedReason = await computeBlockedReason({
      quest,
      telegramId,
      chatId: 0, // список не прив'язаний до чату - precondition-правила зараз chatId не використовують
      user,
      isActive: activeCodes.has(quest.code),
      lastResolvedAt: lastResolvedByCode.get(quest.code) ?? null,
      activeCount: activeAssignments.length,
      settings,
    });
    offers.push({ quest, blockedReason });
  }
  return offers;
}

export async function acceptQuest(
  telegramId: number,
  questCode: string,
  chatId: number,
): Promise<{ assignment: QuestAssignmentHydratedDocument } | { error: string }> {
  const settings = await getQuestSettings();
  if (!settings.is_enabled) {
    return { error: 'Квести зараз тимчасово вимкнено' };
  }

  const quest = await QuestModel.findOne({ code: questCode, is_enabled: true });
  if (!quest) {
    return { error: 'Цей квест зараз недоступний' };
  }

  const user = await UserModel.findOne({ telegram_id: telegramId });
  if (!user) {
    return { error: 'Гравця не знайдено' };
  }

  const [activeAssignments, lastResolved] = await Promise.all([
    QuestAssignmentModel.find({ telegram_id: telegramId, status: 'active' }),
    QuestAssignmentModel.findOne({ telegram_id: telegramId, quest_code: questCode, status: { $ne: 'active' } }).sort({
      resolved_at: -1,
    }),
  ]);

  // Кнопка могла провисіти в чаті годину - перевіряємо ще раз перед записом.
  const blockedReason = await computeBlockedReason({
    quest,
    telegramId,
    chatId,
    user,
    isActive: activeAssignments.some((a) => a.quest_code === questCode),
    lastResolvedAt: lastResolved?.resolved_at ?? null,
    activeCount: activeAssignments.length,
    settings,
  });
  if (blockedReason) {
    return { error: blockedReason };
  }

  const rule = getQuestRule(quest.rule);
  if (!rule) {
    return { error: 'Правило квесту не знайдено - повідом адміна' };
  }

  const ctx: QuestStartContext = { telegramId, chatId, user };
  const baseline = (await rule.baseline?.(ctx)) ?? {};

  const startedAt = nowUtc().toDate();
  const expiresAt = nowUtc().add(quest.duration_minutes, 'minute').toDate();

  try {
    const assignment = await QuestAssignmentModel.create({
      telegram_id: telegramId,
      quest_code: questCode,
      chat_id: chatId,
      status: 'active',
      snapshot: {
        emoji: quest.emoji,
        name: quest.name,
        description: quest.description,
        kind: rule.kind,
        rule: quest.rule,
        target: quest.target,
        params: quest.params,
        duration_minutes: quest.duration_minutes,
        reward_cm: roundCm(quest.reward_cm * settings.reward_multiplier),
        penalty_cm: roundCm(quest.penalty_cm * settings.penalty_multiplier),
      },
      progress: 0,
      hit_keys: [],
      baseline,
      started_at: startedAt,
      expires_at: expiresAt,
      resolved_at: null,
      applied_cm: 0,
      reminder_sent_at: null,
      chat_message_id: null,
    });
    return { assignment };
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      return { error: 'Цей квест уже активний' };
    }
    throw error;
  }
}

/** Викликати одразу після успішного надсилання анонсу старту (quests.command.ts). */
export async function recordQuestChatMessage(assignmentId: string, messageId: number): Promise<void> {
  await QuestAssignmentModel.updateOne({ _id: assignmentId }, { $set: { chat_message_id: messageId } });
}

async function syncQuestStreakBest(telegramId: number): Promise<void> {
  const progress = await getOrCreateProgress(telegramId);
  const current = progress.counters?.get('quest_streak_current') ?? 0;
  await bumpAchievementCounters(telegramId, { max: { 'counters.quest_streak_best': current } });
}

/**
 * Атомарний перехід active -> outcome (7 із «Зафіксованих рішень»): гонка
 * «подія закриває квест» проти «sweeper вішає провал» не може дати
 * подвійного списання - другий виклик просто отримає null.
 */
export async function resolveAssignment(
  assignment: QuestAssignmentDocument,
  outcome: 'completed' | 'failed' | 'cancelled',
  telegram: Telegram | null = null,
): Promise<QuestAssignmentHydratedDocument | null> {
  const resolved = await QuestAssignmentModel.findOneAndUpdate(
    { _id: assignment._id, status: 'active' },
    { $set: { status: outcome, resolved_at: nowUtc().toDate() } },
    { new: true },
  );
  if (!resolved) {
    return null;
  }

  const user = await UserModel.findOne({ telegram_id: resolved.telegram_id });
  if (!user) {
    return resolved;
  }

  // 'cancelled' застосовує штраф так само, як 'failed' (3.5 плану: інакше
  // «взяв -> побачив, що не встигаю -> скасував» робить штраф декоративним).
  const signedValueDelta =
    outcome === 'completed'
      ? resolved.snapshot.reward_cm * modeSign(user.mode)
      : -resolved.snapshot.penalty_cm * modeSign(user.mode);

  const updatedUser = await UserModel.findOneAndUpdate(
    { _id: user._id },
    buildClampedValueUpdate(signedValueDelta, user.mode),
    { new: true },
  );
  // У бік мети гравця (не сира зміна value) - однаково читається і для grow, і для drill.
  const appliedCm = updatedUser ? roundCm((updatedUser.value - user.value) * modeSign(user.mode)) : 0;

  await QuestAssignmentModel.updateOne({ _id: resolved._id }, { $set: { applied_cm: appliedCm } });
  resolved.applied_cm = appliedCm;

  if (outcome === 'completed') {
    await safeBump(resolved.telegram_id, {
      inc: { 'counters.quests_completed': 1, 'counters.quest_streak_current': 1 },
    });
    await syncQuestStreakBest(resolved.telegram_id);
  } else {
    await safeBump(resolved.telegram_id, {
      inc: { 'counters.quests_failed': 1 },
      set: { 'counters.quest_streak_current': 0 },
    });
  }

  await safeSync(resolved.telegram_id);

  if (outcome !== 'cancelled') {
    const settings = await getQuestSettings();
    if (settings.announce_enabled) {
      const effectiveTelegram = telegram ?? getBotInstance()?.telegram ?? null;
      await announceQuestResolution(effectiveTelegram, user, resolved, outcome, appliedCm);
    }
  }

  return resolved;
}

export async function handleQuestEvent(telegramId: number, event: QuestEvent): Promise<void> {
  const assignments = await QuestAssignmentModel.find({ telegram_id: telegramId, status: 'active' });
  if (assignments.length === 0) {
    return;
  }

  for (const assignment of assignments) {
    const rule = getQuestRule(assignment.snapshot.rule);
    if (!rule) {
      continue;
    }

    const patch = applyEvent(assignment, event, rule);
    if (patch === null) {
      continue;
    }

    // Спершу пишемо прогрес, потім резолвимо - у журналі лишається фінальний стан.
    const fieldUpdate: Record<string, unknown> = {};
    if (patch.progress !== undefined) fieldUpdate.progress = patch.progress;
    if (patch.hitKeys !== undefined) fieldUpdate.hit_keys = patch.hitKeys;
    if (Object.keys(fieldUpdate).length > 0) {
      await QuestAssignmentModel.updateOne({ _id: assignment._id }, { $set: fieldUpdate });
      if (patch.progress !== undefined) assignment.progress = patch.progress;
      if (patch.hitKeys !== undefined) assignment.hit_keys = patch.hitKeys;
    }

    if (patch.outcome === 'completed' || patch.outcome === 'failed') {
      await resolveAssignment(assignment, patch.outcome);
    }
  }
}

/** Обгортка «не впасти»: підсистема квестів ніколи не ламає гарячий шлях (/metr, дуель, кінець раунду). */
export async function safeQuestEvent(telegramId: number, event: QuestEvent): Promise<void> {
  try {
    await handleQuestEvent(telegramId, event);
  } catch (error) {
    console.error('[quests] failed to handle quest event', error);
  }
}

export async function getActiveAssignmentById(assignmentId: string): Promise<QuestAssignmentHydratedDocument | null> {
  return QuestAssignmentModel.findOne({ _id: assignmentId, status: 'active' });
}

/** «❌ Здатись»: штраф застосовується повністю (3.5 плану). */
export async function cancelQuest(
  telegramId: number,
  assignmentId: string,
  telegram: Telegram | null = null,
): Promise<{ assignment: QuestAssignmentHydratedDocument } | { error: string }> {
  const assignment = await QuestAssignmentModel.findOne({ _id: assignmentId, telegram_id: telegramId, status: 'active' });
  if (!assignment) {
    return { error: 'Цей квест уже неактивний' };
  }
  const resolved = await resolveAssignment(assignment, 'cancelled', telegram);
  if (!resolved) {
    return { error: 'Цей квест уже неактивний' };
  }
  return { assignment: resolved };
}

export interface QuestCategoryProgress {
  completedDistinct: number;
  total: number;
}

export interface QuestSummary {
  activeAssignments: QuestAssignmentHydratedDocument[];
  completedCount: number;
  failedCount: number;
  /** Сума applied_cm по всіх закриттях - у бік мети гравця. */
  balanceCm: number;
  categoryProgress: Record<QuestCategory, QuestCategoryProgress>;
}

/** Дані для екрана зведення (6.2 плану). */
export async function getQuestSummary(telegramId: number): Promise<QuestSummary> {
  const [activeAssignments, resolvedAssignments, quests] = await Promise.all([
    QuestAssignmentModel.find({ telegram_id: telegramId, status: 'active' }).sort({ expires_at: 1 }),
    QuestAssignmentModel.find({ telegram_id: telegramId, status: { $in: ['completed', 'failed', 'cancelled'] } }),
    QuestModel.find({ is_enabled: true }),
  ]);

  const completedCount = resolvedAssignments.filter((a) => a.status === 'completed').length;
  const failedCount = resolvedAssignments.filter((a) => a.status === 'failed' || a.status === 'cancelled').length;
  const balanceCm = roundCm(resolvedAssignments.reduce((sum, a) => sum + a.applied_cm, 0));

  const completedCodes = new Set(
    resolvedAssignments.filter((a) => a.status === 'completed').map((a) => a.quest_code),
  );

  const categoryProgress = {} as Record<QuestCategory, QuestCategoryProgress>;
  for (const category of QUEST_CATEGORY_ORDER) {
    const inCategory = quests.filter((q) => q.category === category);
    categoryProgress[category] = {
      completedDistinct: inCategory.filter((q) => completedCodes.has(q.code)).length,
      total: inCategory.length,
    };
  }

  return { activeAssignments, completedCount, failedCount, balanceCm, categoryProgress };
}

// --- Адмінка (7.1 плану) ---

export async function countActiveAssignmentsByCode(questCode: string): Promise<number> {
  return QuestAssignmentModel.countDocuments({ quest_code: questCode, status: 'active' });
}

export async function countActiveAssignmentsGrouped(): Promise<Map<string, number>> {
  const agg = await QuestAssignmentModel.aggregate<{ _id: string; count: number }>([
    { $match: { status: 'active' } },
    { $group: { _id: '$quest_code', count: { $sum: 1 } } },
  ]);
  return new Map(agg.map((row) => [row._id, row.count]));
}

export interface QuestStatsEntry {
  code: string;
  emoji: string;
  name: string;
  taken: number;
  completed: number;
  failed: number;
  cancelled: number;
  averageResolutionMinutes: number | null;
}

/** Зведення для GET /quests/stats - по КОЖНОМУ визначенню, навіть якщо ще ніхто не брав. */
export async function getQuestStats(): Promise<QuestStatsEntry[]> {
  const [quests, agg] = await Promise.all([
    QuestModel.find().sort({ category: 1, sort_order: 1 }),
    QuestAssignmentModel.aggregate<{
      _id: string;
      taken: number;
      completed: number;
      failed: number;
      cancelled: number;
      averageResolutionMinutes: number | null;
    }>([
      {
        $group: {
          _id: '$quest_code',
          taken: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          averageResolutionMinutes: {
            $avg: {
              $cond: [
                { $ne: ['$resolved_at', null] },
                { $divide: [{ $subtract: ['$resolved_at', '$started_at'] }, 60000] },
                null,
              ],
            },
          },
        },
      },
    ]),
  ]);

  const byCode = new Map(agg.map((row) => [row._id, row]));
  return quests.map((quest) => {
    const stats = byCode.get(quest.code);
    return {
      code: quest.code,
      emoji: quest.emoji,
      name: quest.name,
      taken: stats?.taken ?? 0,
      completed: stats?.completed ?? 0,
      failed: stats?.failed ?? 0,
      cancelled: stats?.cancelled ?? 0,
      averageResolutionMinutes: stats?.averageResolutionMinutes ?? null,
    };
  });
}

/**
 * Скидає лічильники quests_completed/quests_failed/quest_streak_current/best у
 * achievements-прогресі (там вони й живуть - safeBump у resolveAssignment).
 * Сам журнал quest_assignments НЕ чіпається - він незнищуваний (п.6 ТЗ, розділ
 * «Зафіксовані рішення»).
 */
export async function resetQuestCounters(telegramId: number | null): Promise<number> {
  const filter = telegramId === null ? {} : { telegram_id: telegramId };
  const result = await AchievementProgressModel.updateMany(filter, {
    $set: {
      'counters.quests_completed': 0,
      'counters.quests_failed': 0,
      'counters.quest_streak_current': 0,
      'counters.quest_streak_best': 0,
    },
  });
  return result.modifiedCount;
}
