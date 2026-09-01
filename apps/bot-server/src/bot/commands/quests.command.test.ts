import { describe, expect, it } from 'vitest';
import type { QuestAssignmentHydratedDocument } from '../../database/models/quest-assignment.model';
import type { QuestHydratedDocument } from '../../database/models/quest.model';
import type { QuestSettingsHydratedDocument } from '../../database/models/quest-settings.model';
import type { UserDocument } from '../../database/models/user.model';
import type { QuestOffer, QuestSummary } from '../../quests/quest.service';
import { buildCategoryView, buildConfirmView, buildSummaryView } from './quests.command';

function fakeUser(): UserDocument {
  return {
    telegram_id: 1,
    username: null,
    first_name: 'Petro',
    value: 20,
    last_measurement_at: null,
    chats: [1],
    work: { schedule: [5, 2], last_weekend: new Date() },
    season_growth: 0,
    round_growth: 0,
    round_best_delta: null,
    round_measurement_count: 0,
    titles: [],
    mode: 'grow',
    mode_changed_at: null,
    experience: 0,
    streak_current: 0,
    streak_best: 0,
    created_at: new Date(),
    updated_at: new Date(),
  } as unknown as UserDocument;
}

function fakeAssignment(overrides: Partial<QuestAssignmentHydratedDocument> = {}): QuestAssignmentHydratedDocument {
  return {
    id: '507f1f77bcf86cd799439011',
    telegram_id: 1,
    quest_code: 'flawless',
    chat_id: 1,
    status: 'active',
    snapshot: {
      emoji: '🛡',
      name: 'Бездоганний',
      description: '48 год без програної дуелі.',
      kind: 'avoid',
      rule: 'no_duel_loss',
      target: 1,
      params: {},
      duration_minutes: 2880,
      reward_cm: 14,
      penalty_cm: 10,
    },
    progress: 0,
    hit_keys: [],
    baseline: {},
    started_at: new Date(),
    expires_at: new Date(Date.now() + 41 * 60 * 60 * 1000 + 12 * 60 * 1000),
    resolved_at: null,
    applied_cm: 0,
    reminder_sent_at: null,
    chat_message_id: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  } as unknown as QuestAssignmentHydratedDocument;
}

function fakeSummary(overrides: Partial<QuestSummary> = {}): QuestSummary {
  return {
    activeAssignments: [],
    completedCount: 17,
    failedCount: 4,
    balanceCm: 58,
    categoryProgress: {
      restraint: { completedDistinct: 3, total: 8 },
      precision: { completedDistinct: 2, total: 6 },
      position: { completedDistinct: 1, total: 8 },
      luck: { completedDistinct: 4, total: 6 },
      duel: { completedDistinct: 2, total: 4 },
    },
    ...overrides,
  };
}

function fakeQuest(overrides: Partial<QuestHydratedDocument> = {}): QuestHydratedDocument {
  return {
    code: 'flawless',
    emoji: '🛡',
    name: 'Бездоганний',
    description: '48 годин не програти жодної дуелі.',
    category: 'restraint',
    rule: 'no_duel_loss',
    target: 1,
    params: {},
    duration_minutes: 2880,
    reward_cm: 14,
    penalty_cm: 10,
    cooldown_hours: 72,
    is_enabled: true,
    sort_order: 0,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  } as unknown as QuestHydratedDocument;
}

function fakeSettings(overrides: Partial<QuestSettingsHydratedDocument> = {}): QuestSettingsHydratedDocument {
  return {
    is_enabled: true,
    announce_enabled: true,
    reward_multiplier: 1,
    penalty_multiplier: 1,
    max_active_quests: 0,
    reminder_before_minutes: 30,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  } as unknown as QuestSettingsHydratedDocument;
}

describe('buildSummaryView', () => {
  it('shows active quests with a countdown timer', () => {
    const { text } = buildSummaryView(fakeUser(), fakeSummary({ activeAssignments: [fakeAssignment()] }), 1);
    expect(text).toContain('🛡 Бездоганний');
    expect(text).toMatch(/⏳ \d+ год \d{2} хв/);
  });

  it('includes counts and balance in the header', () => {
    const { text } = buildSummaryView(fakeUser(), fakeSummary(), 1);
    expect(text).toContain('Активні: 0');
    expect(text).toContain('Виконано: 17');
    expect(text).toContain('Провалено: 4');
    expect(text).toContain('+58');
  });

  it('offers a surrender button for each active quest', () => {
    const { markup } = buildSummaryView(fakeUser(), fakeSummary({ activeAssignments: [fakeAssignment()] }), 1);
    const callbackData = markup.reply_markup.inline_keyboard
      .flat()
      .map((button) => ('callback_data' in button ? button.callback_data : null));
    expect(callbackData).toContain('q:x:507f1f77bcf86cd799439011');
  });
});

describe('buildConfirmView', () => {
  it('shows both the reward and the penalty', () => {
    const { text } = buildConfirmView(fakeQuest(), fakeSettings(), 1);
    expect(text).toContain('+14 см');
    expect(text).toContain('−10 см');
  });

  it('applies the settings multipliers', () => {
    const { text } = buildConfirmView(fakeQuest(), fakeSettings({ reward_multiplier: 2, penalty_multiplier: 0.5 }), 1);
    expect(text).toContain('+28 см');
    expect(text).toContain('−5 см');
  });
});

describe('buildCategoryView', () => {
  it('does not offer a take button for a blocked quest', () => {
    const offers: QuestOffer[] = [{ quest: fakeQuest(), blockedReason: 'вже взято' }];
    const { text, markup } = buildCategoryView('restraint', offers, 1);
    expect(text).toContain('вже взято');
    const callbackData = markup.reply_markup.inline_keyboard
      .flat()
      .map((button) => ('callback_data' in button ? button.callback_data : null));
    expect(callbackData).not.toContain('q:p:flawless:1');
  });

  it('offers a take button for an unblocked quest', () => {
    const offers: QuestOffer[] = [{ quest: fakeQuest(), blockedReason: null }];
    const { markup } = buildCategoryView('restraint', offers, 1);
    const callbackData = markup.reply_markup.inline_keyboard
      .flat()
      .map((button) => ('callback_data' in button ? button.callback_data : null));
    expect(callbackData).toContain('q:p:flawless:1');
  });
});
