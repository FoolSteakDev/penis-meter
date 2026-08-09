import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isRestDayForUser } from './work-schedule.util';

dayjs.extend(utc);

const NOW = dayjs.utc('2026-07-13T12:00:00.000Z'); // понеділок

function setNow(offsetDays = 0): void {
  vi.setSystemTime(NOW.add(offsetDays, 'day').toDate());
}

beforeEach(() => {
  vi.useFakeTimers();
  setNow(0);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('isRestDayForUser - schedule [5,2]', () => {
  const anchor = NOW.toDate(); // daysSinceAnchor=0 при offset=0

  it('is a rest day at the anchor (position 0)', () => {
    setNow(0);
    expect(isRestDayForUser({ schedule: [5, 2], lastWeekend: anchor })).toBe(true);
  });

  it('is a rest day one day after the anchor (position 1)', () => {
    setNow(1);
    expect(isRestDayForUser({ schedule: [5, 2], lastWeekend: anchor })).toBe(true);
  });

  it('is a work day two days after the anchor (position 2)', () => {
    setNow(2);
    expect(isRestDayForUser({ schedule: [5, 2], lastWeekend: anchor })).toBe(false);
  });

  it('is a work day six days after the anchor (position 6)', () => {
    setNow(6);
    expect(isRestDayForUser({ schedule: [5, 2], lastWeekend: anchor })).toBe(false);
  });

  it('cycles back to rest on day 7 (full cycle)', () => {
    setNow(7);
    expect(isRestDayForUser({ schedule: [5, 2], lastWeekend: anchor })).toBe(true);
  });
});

describe('isRestDayForUser - schedule [2,2]', () => {
  const anchor = NOW.toDate();

  it('rest days are positions 0-1', () => {
    setNow(0);
    expect(isRestDayForUser({ schedule: [2, 2], lastWeekend: anchor })).toBe(true);
    setNow(1);
    expect(isRestDayForUser({ schedule: [2, 2], lastWeekend: anchor })).toBe(true);
  });

  it('work days are positions 2-3', () => {
    setNow(2);
    expect(isRestDayForUser({ schedule: [2, 2], lastWeekend: anchor })).toBe(false);
    setNow(3);
    expect(isRestDayForUser({ schedule: [2, 2], lastWeekend: anchor })).toBe(false);
  });
});

describe('isRestDayForUser - schedule [4,3]', () => {
  const anchor = NOW.toDate();

  it('rest days are positions 0-2', () => {
    setNow(2);
    expect(isRestDayForUser({ schedule: [4, 3], lastWeekend: anchor })).toBe(true);
  });

  it('work days are positions 3-6', () => {
    setNow(3);
    expect(isRestDayForUser({ schedule: [4, 3], lastWeekend: anchor })).toBe(false);
    setNow(6);
    expect(isRestDayForUser({ schedule: [4, 3], lastWeekend: anchor })).toBe(false);
  });
});

describe('isRestDayForUser - invalid schedule falls back to calendar weekend', () => {
  it('falls back when schedule length is wrong', () => {
    setNow(0); // 2026-07-13 - понеділок, не вихідний
    expect(isRestDayForUser({ schedule: [5], lastWeekend: NOW.toDate() })).toBe(false);
  });

  it('falls back when lastWeekend is null', () => {
    setNow(0);
    expect(isRestDayForUser({ schedule: [5, 2], lastWeekend: null })).toBe(false);
  });

  it('falls back to true on an actual calendar Saturday', () => {
    setNow(5); // 2026-07-18 - субота
    expect(isRestDayForUser({ schedule: [5], lastWeekend: NOW.toDate() })).toBe(true);
  });

  it('falls back when work is null/undefined', () => {
    setNow(0);
    expect(isRestDayForUser(null)).toBe(false);
    expect(isRestDayForUser(undefined)).toBe(false);
  });
});

describe('isRestDayForUser - negative daysSinceAnchor', () => {
  it('cycles correctly backward for an anchor set in the future', () => {
    // lastWeekend на 7 днів ПІЗНІШЕ за "зараз" -> daysSinceAnchor = -7,
    // що для циклу довжиною 7 еквівалентно позиції 0 (rest day).
    const futureAnchor = NOW.add(7, 'day').toDate();
    setNow(0);
    expect(isRestDayForUser({ schedule: [5, 2], lastWeekend: futureAnchor })).toBe(true);
  });

  it('does not throw and returns a boolean for a smaller negative offset', () => {
    const futureAnchor = NOW.add(1, 'day').toDate();
    setNow(0);
    const result = isRestDayForUser({ schedule: [5, 2], lastWeekend: futureAnchor });
    expect(typeof result).toBe('boolean');
  });
});
