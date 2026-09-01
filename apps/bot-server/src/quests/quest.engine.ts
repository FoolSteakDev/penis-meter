import type { QuestAssignmentDocument } from '../database/models/quest-assignment.model';
import type { QuestEvent } from './quest.events';
import type { QuestHoldContext, QuestRule } from './quest.rules';

export type QuestOutcome = 'none' | 'completed' | 'failed';

export interface ProgressPatch {
  progress?: number;
  hitKeys?: string[];
  outcome: QuestOutcome;
}

/** Що робить одна подія з одним активним призначенням. Без БД, без побічних ефектів. */
export function applyEvent(
  assignment: QuestAssignmentDocument,
  event: QuestEvent,
  rule: QuestRule,
): ProgressPatch | null {
  if (rule.kind === 'avoid') {
    return rule.violates?.(event, assignment) ? { outcome: 'failed' } : null;
  }

  if (rule.kind === 'hold') {
    // hold реагує лише на sweeper (dedlain/poll), не на події гарячого шляху.
    return null;
  }

  // kind === 'reach'
  if (rule.distinctKey) {
    const key = rule.distinctKey(event, assignment);
    if (key === null || assignment.hit_keys.includes(key)) {
      return null;
    }
    const hitKeys = [...assignment.hit_keys, key];
    const outcome: QuestOutcome = hitKeys.length >= assignment.snapshot.target ? 'completed' : 'none';
    return { hitKeys, outcome };
  }

  const contribution = rule.contribution?.(event, assignment) ?? 0;
  const willReset = rule.resets?.(event, assignment) ?? false;
  let nextProgress = assignment.progress + contribution;
  if (willReset) {
    nextProgress = 0;
  }
  if (nextProgress === assignment.progress) {
    return null;
  }
  const outcome: QuestOutcome = nextProgress >= assignment.snapshot.target ? 'completed' : 'none';
  return { progress: nextProgress, outcome };
}

/** Чим закінчується квест на дедлайні. Для 'avoid' — успіх, для 'reach' — провал, для 'hold' — за станом. */
export function resolveOnExpiry(
  assignment: QuestAssignmentDocument,
  rule: QuestRule,
  holdCtx: QuestHoldContext | null,
): 'completed' | 'failed' {
  if (rule.kind === 'avoid') {
    return 'completed';
  }
  if (rule.kind === 'reach') {
    return 'failed';
  }
  if (!holdCtx || !rule.evaluate) {
    return 'failed';
  }
  return rule.evaluate(holdCtx) ? 'completed' : 'failed';
}
