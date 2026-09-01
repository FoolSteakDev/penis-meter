import { DuelHistoryModel } from '../database/models/duel-history.model';
import type { QuestAssignmentDocument } from '../database/models/quest-assignment.model';
import type { QuestKind } from '../database/models/quest.model';
import type { UserDocument } from '../database/models/user.model';
import { getOrCreateProgress } from '../achievements/achievement-progress.service';
import { progress } from '../utils/mode.util';
import { computeChatStanding } from './quest-standings.util';
import type { QuestEvent } from './quest.events';

export interface QuestRuleParam {
  key: string;
  label: string;
  type: 'number' | 'string_list';
  required: boolean;
  hint?: string;
}

export interface QuestStartContext {
  telegramId: number;
  chatId: number;
  user: UserDocument;
}

export interface QuestHoldContext {
  user: UserDocument;
  assignment: QuestAssignmentDocument;
  /** Місце гравця в рейтингу чату зараз; null — гравця немає в рейтингу. */
  chatRank: number | null;
  /** Скільки гравців у рейтингу чату. */
  chatSize: number;
  /** Середній приріст активних гравців чату за вікно квесту (наближення, див. quest-standings.util.ts). */
  chatAverageGrowth: number;
  /** counters.total_measurements гравця на момент резолву (achievements progress) — для exact_measurements. */
  totalMeasurementsCount: number;
}

export interface QuestRule {
  code: string;
  label: string;
  kind: QuestKind;
  /** Одиниця цілі — для підписів у боті й адмінці. */
  unit: 'count' | 'cm' | 'none';
  params: QuestRuleParam[];
  /** Що зафіксувати на старті (ранг, останній кривдник, поточний прогрес). */
  baseline?: (ctx: QuestStartContext) => Promise<Record<string, unknown>>;
  /** Квест не можна взяти, якщо повертає рядок — це причина відмови. */
  precondition?: (ctx: QuestStartContext) => Promise<string | null>;

  // kind === 'reach'
  contribution?: (event: QuestEvent, a: QuestAssignmentDocument) => number;
  /** Ключ для distinct-режиму. Повертає null — подія не рахується. */
  distinctKey?: (event: QuestEvent, a: QuestAssignmentDocument) => string | null;
  /** true — прогрес обнуляється (правила «поспіль»). */
  resets?: (event: QuestEvent, a: QuestAssignmentDocument) => boolean;

  // kind === 'avoid'
  violates?: (event: QuestEvent, a: QuestAssignmentDocument) => boolean;

  // kind === 'hold'
  evaluate?: (ctx: QuestHoldContext) => boolean;
  /** true — стан треба перевіряти й ДО дедлайну (для дострокового провалу). Дефолт false. */
  pollable?: boolean;
}

function num(params: Record<string, unknown>, key: string, fallback?: number): number {
  const value = params[key];
  return typeof value === 'number' ? value : (fallback as number);
}

function strList(params: Record<string, unknown>, key: string): string[] {
  const value = params[key];
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

function isMeaningfulCondition(code: string | null): code is string {
  return code !== null && code !== 'base';
}

// --- Утримання (avoid) ---

const noMeasurement: QuestRule = {
  code: 'no_measurement',
  label: 'Без жодного виміру',
  kind: 'avoid',
  unit: 'none',
  params: [],
  violates: (event) => event.type === 'measurement',
};

const noDuel: QuestRule = {
  code: 'no_duel',
  label: 'Без жодної дуелі',
  kind: 'avoid',
  unit: 'none',
  params: [],
  violates: (event) => event.type === 'duel_finished',
};

const noDuelLoss: QuestRule = {
  code: 'no_duel_loss',
  label: 'Без програної дуелі',
  kind: 'avoid',
  unit: 'none',
  params: [],
  violates: (event) => event.type === 'duel_finished' && !event.won,
};

const noNightMeasurement: QuestRule = {
  code: 'no_night_measurement',
  label: 'Без нічних вимірів',
  kind: 'avoid',
  unit: 'none',
  params: [],
  violates: (event) => event.type === 'measurement' && event.isNight,
};

const noModeSwitch: QuestRule = {
  code: 'no_mode_switch',
  label: 'Без зміни режиму',
  kind: 'avoid',
  unit: 'none',
  params: [],
  violates: (event) => event.type === 'mode_switch',
};

const noStreakBreak: QuestRule = {
  code: 'no_streak_break',
  label: 'Без розриву серії',
  kind: 'avoid',
  unit: 'none',
  params: [],
  violates: (event) => event.type === 'measurement' && !event.streakKept,
};

const noBadMeasurement: QuestRule = {
  code: 'no_bad_measurement',
  label: 'Без глибоких провалів у вимірах',
  kind: 'avoid',
  unit: 'none',
  params: [{ key: 'maxDip', label: 'Макс. допустимий мінус (см)', type: 'number', required: true }],
  violates: (event, a) =>
    event.type === 'measurement' && event.progressDelta <= -num(a.snapshot.params, 'maxDip'),
};

const noBigStake: QuestRule = {
  code: 'no_big_stake',
  label: 'Без великих ставок',
  kind: 'avoid',
  unit: 'none',
  params: [{ key: 'maxStake', label: 'Макс. ставка дуелі (см)', type: 'number', required: true }],
  violates: (event, a) =>
    event.type === 'duel_finished' && event.stake > num(a.snapshot.params, 'maxStake'),
};

// --- Точність і вікна (reach) ---

const punctualChain: QuestRule = {
  code: 'punctual_chain',
  label: 'Виміри поспіль секунда-в-секунду',
  kind: 'reach',
  unit: 'count',
  params: [],
  contribution: (event) => (event.type === 'measurement' && event.isPunctual ? 1 : 0),
  resets: (event) => event.type === 'measurement' && !event.isPunctual,
};

const hourWindowDays: QuestRule = {
  code: 'hour_window_days',
  label: 'Вимір у часовому вікні в різні дні',
  kind: 'reach',
  unit: 'count',
  params: [
    { key: 'from', label: 'Година початку вікна (0-23)', type: 'number', required: true },
    { key: 'to', label: 'Година кінця вікна (0-23, виключно)', type: 'number', required: true },
  ],
  distinctKey: (event, a) => {
    if (event.type !== 'measurement') return null;
    const from = num(a.snapshot.params, 'from');
    const to = num(a.snapshot.params, 'to');
    return event.kyivHour >= from && event.kyivHour < to ? event.kyivDay : null;
  },
};

const distinctDays: QuestRule = {
  code: 'distinct_days',
  label: 'Хоч один вимір щодня поспіль',
  kind: 'reach',
  unit: 'count',
  params: [],
  distinctKey: (event) => (event.type === 'measurement' ? event.kyivDay : null),
};

const positiveChain: QuestRule = {
  code: 'positive_chain',
  label: 'Виміри поспіль у плюс',
  kind: 'reach',
  unit: 'count',
  params: [],
  contribution: (event) => (event.type === 'measurement' && event.progressDelta > 0 ? 1 : 0),
  resets: (event) => event.type === 'measurement' && event.progressDelta <= 0,
};

const distinctConditions: QuestRule = {
  code: 'distinct_conditions',
  label: 'Різні спецумови',
  kind: 'reach',
  unit: 'count',
  params: [],
  distinctKey: (event) => {
    if (event.type !== 'measurement') return null;
    return isMeaningfulCondition(event.conditionCode) ? event.conditionCode : null;
  },
};

const conditionInWindow: QuestRule = {
  code: 'condition_in_window',
  label: 'Спецумова(и) за вікно',
  kind: 'reach',
  unit: 'count',
  params: [
    {
      key: 'codes',
      label: 'Коди умов (пусто = будь-яка спецумова)',
      type: 'string_list',
      required: false,
      hint: 'напр. weather, crypto, currency, critical, moon_phase',
    },
  ],
  contribution: (event, a) => {
    if (event.type !== 'measurement' || !isMeaningfulCondition(event.conditionCode)) return 0;
    const codes = strList(a.snapshot.params, 'codes');
    return codes.length === 0 || codes.includes(event.conditionCode) ? 1 : 0;
  },
};

const bigHit: QuestRule = {
  code: 'big_hit',
  label: 'Один великий приріст',
  kind: 'reach',
  unit: 'count',
  params: [{ key: 'minDelta', label: 'Мінімальний приріст за вимір (см)', type: 'number', required: true }],
  contribution: (event, a) =>
    event.type === 'measurement' && event.progressDelta >= num(a.snapshot.params, 'minDelta') ? 1 : 0,
};

// --- Позиція й порівняння (hold) ---

const rankAtMost: QuestRule = {
  code: 'rank_at_most',
  label: 'Утримати місце в рейтингу чату',
  kind: 'hold',
  unit: 'count',
  params: [{ key: 'maxRank', label: 'Не нижче якого місця', type: 'number', required: true }],
  evaluate: (ctx) => {
    const maxRank = num(ctx.assignment.snapshot.params, 'maxRank');
    return ctx.chatRank !== null && ctx.chatRank <= maxRank;
  },
};

const rankImproved: QuestRule = {
  code: 'rank_improved',
  label: 'Піднятись у рейтингу чату',
  kind: 'hold',
  unit: 'count',
  params: [{ key: 'minSteps', label: 'Мінімум сходинок вгору (дефолт 1)', type: 'number', required: false }],
  baseline: async (ctx) => {
    const standing = await computeChatStanding(ctx.chatId, ctx.telegramId);
    return { rank: standing.rank };
  },
  evaluate: (ctx) => {
    if (ctx.chatRank === null) return false;
    const startRank = ctx.assignment.baseline.rank;
    if (typeof startRank !== 'number') return false;
    const minSteps = num(ctx.assignment.snapshot.params, 'minSteps', 1);
    return startRank - ctx.chatRank >= minSteps;
  },
};

const growthInRange: QuestRule = {
  code: 'growth_in_range',
  label: 'Чистий приріст за вікно у заданих межах',
  kind: 'hold',
  unit: 'cm',
  params: [
    { key: 'tolerance', label: 'Допустиме відхилення (см)', type: 'number', required: true },
    {
      key: 'requireMode',
      label: 'Обов’язковий режим (grow або drill, пусто — будь-який)',
      type: 'string_list',
      required: false,
    },
  ],
  baseline: async (ctx) => ({ progress: progress(ctx.user.value, ctx.user.mode) }),
  evaluate: (ctx) => {
    const baselineProgress = ctx.assignment.baseline.progress;
    if (typeof baselineProgress !== 'number') return false;
    const requireMode = strList(ctx.assignment.snapshot.params, 'requireMode')[0];
    if (requireMode && ctx.user.mode !== requireMode) return false;
    const tolerance = num(ctx.assignment.snapshot.params, 'tolerance');
    const grown = progress(ctx.user.value, ctx.user.mode) - baselineProgress;
    return Math.abs(grown - ctx.assignment.snapshot.target) <= tolerance;
  },
};

const exactMeasurements: QuestRule = {
  code: 'exact_measurements',
  label: 'Рівно N вимірів за вікно',
  kind: 'hold',
  unit: 'count',
  params: [],
  baseline: async (ctx) => {
    const achievementProgress = await getOrCreateProgress(ctx.telegramId);
    return { count: achievementProgress.counters?.get('total_measurements') ?? 0 };
  },
  evaluate: (ctx) => {
    const startCount = ctx.assignment.baseline.count;
    if (typeof startCount !== 'number') return false;
    return ctx.totalMeasurementsCount - startCount === ctx.assignment.snapshot.target;
  },
};

const beatChatAverage: QuestRule = {
  code: 'beat_chat_average',
  label: 'Обжени середній приріст чату',
  kind: 'hold',
  unit: 'cm',
  params: [],
  baseline: async (ctx) => ({ progress: progress(ctx.user.value, ctx.user.mode) }),
  evaluate: (ctx) => {
    const baselineProgress = ctx.assignment.baseline.progress;
    if (typeof baselineProgress !== 'number') return false;
    const grown = progress(ctx.user.value, ctx.user.mode) - baselineProgress;
    return grown >= ctx.chatAverageGrowth;
  },
};

// --- Дуельні (reach із порівнянням) ---

const winInitiated: QuestRule = {
  code: 'win_initiated',
  label: 'Виграти дуель, яку сам ініціював',
  kind: 'reach',
  unit: 'count',
  params: [],
  contribution: (event) => (event.type === 'duel_finished' && event.won && event.initiated ? 1 : 0),
};

const winRevenge: QuestRule = {
  code: 'win_revenge',
  label: 'Реванш останньому кривднику',
  kind: 'reach',
  unit: 'count',
  params: [],
  baseline: async (ctx) => {
    const lastLoss = await DuelHistoryModel.findOne({
      $or: [{ challenger_telegram_id: ctx.telegramId }, { target_telegram_id: ctx.telegramId }],
      winner_telegram_id: { $ne: ctx.telegramId },
    }).sort({ created_at: -1 });
    return { rivalId: lastLoss ? lastLoss.winner_telegram_id : null };
  },
  precondition: async (ctx) => {
    const lastLoss = await DuelHistoryModel.findOne({
      $or: [{ challenger_telegram_id: ctx.telegramId }, { target_telegram_id: ctx.telegramId }],
      winner_telegram_id: { $ne: ctx.telegramId },
    }).sort({ created_at: -1 });
    return lastLoss ? null : 'немає кому мстити';
  },
  contribution: (event, a) =>
    event.type === 'duel_finished' && event.won && event.opponentTelegramId === a.baseline.rivalId ? 1 : 0,
};

const winHighStake: QuestRule = {
  code: 'win_high_stake',
  label: 'Виграти дуель на високу ставку',
  kind: 'reach',
  unit: 'count',
  params: [{ key: 'minStake', label: 'Мінімальна ставка дуелі (см)', type: 'number', required: true }],
  contribution: (event, a) =>
    event.type === 'duel_finished' && event.won && event.stake >= num(a.snapshot.params, 'minStake') ? 1 : 0,
};

const winUnderdog: QuestRule = {
  code: 'win_underdog',
  label: 'Виграти в сильнішого опонента',
  kind: 'reach',
  unit: 'count',
  params: [],
  contribution: (event) =>
    event.type === 'duel_finished' && event.won && event.opponentProgress > event.selfProgress ? 1 : 0,
};

export const QUEST_RULES: QuestRule[] = [
  noMeasurement,
  noDuel,
  noDuelLoss,
  noNightMeasurement,
  noModeSwitch,
  noStreakBreak,
  noBadMeasurement,
  noBigStake,
  punctualChain,
  hourWindowDays,
  distinctDays,
  positiveChain,
  distinctConditions,
  conditionInWindow,
  bigHit,
  rankAtMost,
  rankImproved,
  growthInRange,
  exactMeasurements,
  beatChatAverage,
  winInitiated,
  winRevenge,
  winHighStake,
  winUnderdog,
];

const QUEST_RULE_BY_CODE = new Map(QUEST_RULES.map((rule) => [rule.code, rule]));

export function getQuestRule(code: string): QuestRule | undefined {
  return QUEST_RULE_BY_CODE.get(code);
}
