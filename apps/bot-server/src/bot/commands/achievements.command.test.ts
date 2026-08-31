import { describe, expect, it } from 'vitest';
import type { AchievementProgressDocument } from '../../database/models/achievement-progress.model';
import type { UserDocument } from '../../database/models/user.model';
import { ACHIEVEMENTS_BY_CODE } from '../../achievements/achievement.registry';
import { buildSummaryView, formatProgressLine } from './achievements.command';

const METER = ACHIEVEMENTS_BY_CODE.get('meter')!; // thresholds 50/200/600/1500, rewards 5/10/20/50, unit 'count'

function fakeUser(): UserDocument {
  return {
    telegram_id: 1,
    username: null,
    first_name: 'Test',
    value: 0,
    last_measurement_at: null,
    chats: [],
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

function fakeProgress(levels: Record<string, number> = {}, awardedCm = 0): AchievementProgressDocument {
  return {
    telegram_id: 1,
    levels: new Map(Object.entries(levels)),
    counters: new Map(),
    condition_hits: new Map(),
    awarded_cm: awardedCm,
    created_at: new Date(),
    updated_at: new Date(),
  } as unknown as AchievementProgressDocument;
}

describe('formatProgressLine', () => {
  it('shows progress toward the first threshold at level 0', () => {
    expect(formatProgressLine(METER, 0, 0)).toBe('0 / 50 → I (+5 см)');
  });

  it('shows progress toward the next threshold at an intermediate level', () => {
    expect(formatProgressLine(METER, 2, 250)).toBe('250 / 600 → III (+20 см)');
  });

  it('shows a checkmark with no further threshold at max level', () => {
    expect(formatProgressLine(METER, 4, 1600)).toBe('1600 ✅');
  });
});

describe('buildSummaryView', () => {
  it('sums the total opened levels from the values in `levels`, not the map size', () => {
    // Мапа має лише 2 ключі, але сума значень - 5, а не 2.
    const progress = fakeProgress({ meter: 2, winner: 3 });

    const { text } = buildSummaryView(fakeUser(), progress, 1);

    expect(text).toContain('Відкрито рівнів: 5 / 120');
  });

  it('keeps every button callback_data within the 64-byte Telegram limit', () => {
    const telegramId = 9_999_999_999;
    const progress = fakeProgress({});

    const { markup } = buildSummaryView(fakeUser(), progress, telegramId);

    for (const row of markup.reply_markup.inline_keyboard) {
      for (const button of row) {
        if ('callback_data' in button) {
          expect(Buffer.byteLength(button.callback_data, 'utf8')).toBeLessThanOrEqual(64);
        }
      }
    }
  });
});
