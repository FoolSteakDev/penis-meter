import { describe, expect, it } from 'vitest';
import type { QuestAssignmentDocument } from '../database/models/quest-assignment.model';
import { applyEvent, resolveOnExpiry } from './quest.engine';
import { getQuestRule } from './quest.rules';
import type { QuestEvent } from './quest.events';

function baseSnapshot(overrides: Partial<QuestAssignmentDocument['snapshot']> = {}) {
  return {
    emoji: '🧭',
    name: 'Test',
    description: 'Test',
    kind: 'avoid' as const,
    rule: 'no_measurement',
    target: 1,
    params: {},
    duration_minutes: 60,
    reward_cm: 5,
    penalty_cm: 5,
    ...overrides,
  };
}

function fakeAssignment(overrides: Partial<QuestAssignmentDocument> = {}): QuestAssignmentDocument {
  return {
    telegram_id: 1,
    quest_code: 'test',
    chat_id: 1,
    status: 'active',
    snapshot: baseSnapshot(),
    progress: 0,
    hit_keys: [],
    baseline: {},
    started_at: new Date(),
    expires_at: new Date(),
    resolved_at: null,
    applied_cm: 0,
    reminder_sent_at: null,
    chat_message_id: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  } as unknown as QuestAssignmentDocument;
}

function measurementEvent(overrides: Partial<Extract<QuestEvent, { type: 'measurement' }>> = {}): QuestEvent {
  return {
    type: 'measurement',
    chatId: 1,
    progressDelta: 1,
    conditionCode: null,
    isNight: false,
    isPunctual: true,
    streakKept: true,
    streakCurrent: 1,
    mode: 'grow',
    hasTheme: false,
    kyivHour: 12,
    kyivDay: '2026-09-01',
    ...overrides,
  };
}

describe('applyEvent', () => {
  it('avoid fails on the first forbidden event and ignores the rest', () => {
    const rule = getQuestRule('no_measurement')!;
    const assignment = fakeAssignment({ snapshot: baseSnapshot({ kind: 'avoid', rule: 'no_measurement' }) });

    const first = applyEvent(assignment, measurementEvent(), rule);
    expect(first).toEqual({ outcome: 'failed' });

    const secondAssignment = fakeAssignment({ status: 'failed' });
    const second = applyEvent(secondAssignment, measurementEvent(), rule);
    expect(second).toEqual({ outcome: 'failed' });
  });

  it('reach with resets zeroes out and can still reach the target afterwards', () => {
    const rule = getQuestRule('punctual_chain')!;
    const snapshot = baseSnapshot({ kind: 'reach', rule: 'punctual_chain', target: 2 });

    const late = applyEvent(
      fakeAssignment({ snapshot, progress: 1 }),
      measurementEvent({ isPunctual: false }),
      rule,
    );
    expect(late).toEqual({ progress: 0, outcome: 'none' });

    const onTime1 = applyEvent(fakeAssignment({ snapshot, progress: 0 }), measurementEvent({ isPunctual: true }), rule);
    expect(onTime1).toEqual({ progress: 1, outcome: 'none' });

    const onTime2 = applyEvent(fakeAssignment({ snapshot, progress: 1 }), measurementEvent({ isPunctual: true }), rule);
    expect(onTime2).toEqual({ progress: 2, outcome: 'completed' });
  });

  it('distinct does not count the same key twice', () => {
    const rule = getQuestRule('distinct_days')!;
    const snapshot = baseSnapshot({ kind: 'reach', rule: 'distinct_days', target: 2 });
    const assignment = fakeAssignment({ snapshot, hit_keys: ['2026-09-01'] });

    const sameDay = applyEvent(assignment, measurementEvent({ kyivDay: '2026-09-01' }), rule);
    expect(sameDay).toBeNull();

    const newDay = applyEvent(assignment, measurementEvent({ kyivDay: '2026-09-02' }), rule);
    expect(newDay).toEqual({ hitKeys: ['2026-09-01', '2026-09-02'], outcome: 'completed' });
  });

  it('hold without pollable does not react to events at all', () => {
    const rule = getQuestRule('rank_at_most')!;
    const snapshot = baseSnapshot({ kind: 'hold', rule: 'rank_at_most', params: { maxRank: 1 } });
    const assignment = fakeAssignment({ snapshot });

    expect(applyEvent(assignment, measurementEvent(), rule)).toBeNull();
    expect(
      applyEvent(
        assignment,
        { type: 'duel_finished', chatId: 1, opponentTelegramId: 2, won: true, stake: 5, initiated: true, opponentProgress: 1, selfProgress: 1 },
        rule,
      ),
    ).toBeNull();
  });
});

describe('resolveOnExpiry', () => {
  it('avoid resolves to completed on the deadline (survived)', () => {
    const rule = getQuestRule('no_measurement')!;
    const assignment = fakeAssignment({ snapshot: baseSnapshot({ kind: 'avoid', rule: 'no_measurement' }) });
    expect(resolveOnExpiry(assignment, rule, null)).toBe('completed');
  });

  it('reach resolves to failed on the deadline when short of target', () => {
    const rule = getQuestRule('distinct_days')!;
    const snapshot = baseSnapshot({ kind: 'reach', rule: 'distinct_days', target: 3 });
    const assignment = fakeAssignment({ snapshot, hit_keys: ['2026-09-01'] });
    expect(resolveOnExpiry(assignment, rule, null)).toBe('failed');
  });
});
