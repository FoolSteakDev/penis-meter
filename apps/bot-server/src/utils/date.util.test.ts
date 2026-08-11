import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatRemaining, formatRemainingCooldown, isCooldownElapsed, isWeekendUtc, nowUtc } from './date.util';

dayjs.extend(utc);

// MEASUREMENT_COOLDOWN_HOURS не задано в тестовому оточенні -> дефолт 4 год
// (config/constants.ts::DEFAULT_MEASUREMENT_COOLDOWN_HOURS).
const COOLDOWN_HOURS = 4;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-07-13T12:00:00.000Z')); // понеділок
});

afterEach(() => {
  vi.useRealTimers();
});

describe('nowUtc', () => {
  it('returns the current UTC time', () => {
    expect(nowUtc().toISOString()).toBe('2026-07-13T12:00:00.000Z');
  });
});

describe('isCooldownElapsed', () => {
  it('is elapsed when there was no previous measurement', () => {
    expect(isCooldownElapsed(null)).toBe(true);
  });

  it('is not elapsed within the cooldown window', () => {
    const lastMeasurementAt = dayjs.utc().subtract(1, 'hour').toDate();
    expect(isCooldownElapsed(lastMeasurementAt)).toBe(false);
  });

  it('is elapsed once the cooldown window has passed', () => {
    const lastMeasurementAt = dayjs.utc().subtract(COOLDOWN_HOURS + 1, 'hour').toDate();
    expect(isCooldownElapsed(lastMeasurementAt)).toBe(true);
  });
});

describe('isWeekendUtc', () => {
  it('is false on a weekday', () => {
    expect(isWeekendUtc()).toBe(false);
  });

  it('is true on Saturday', () => {
    vi.setSystemTime(new Date('2026-07-18T12:00:00.000Z'));
    expect(isWeekendUtc()).toBe(true);
  });
});

describe('formatRemainingCooldown', () => {
  it('returns 00:00 when there was no previous measurement', () => {
    expect(formatRemainingCooldown(null)).toBe('00:00');
  });

  it('formats the remaining time until cooldown elapses', () => {
    const lastMeasurementAt = dayjs.utc().subtract(1, 'hour').toDate();
    expect(formatRemainingCooldown(lastMeasurementAt)).toBe('03:00');
  });

  it('never goes negative once cooldown has already elapsed', () => {
    const lastMeasurementAt = dayjs.utc().subtract(COOLDOWN_HOURS + 5, 'hour').toDate();
    expect(formatRemainingCooldown(lastMeasurementAt)).toBe('00:00');
  });
});

describe('formatRemaining', () => {
  it('formats the time until an arbitrary future date', () => {
    const until = dayjs.utc().add(1, 'hour').add(30, 'minute').toDate();
    expect(formatRemaining(until)).toBe('01:30');
  });

  it('never goes negative once the date is in the past', () => {
    const until = dayjs.utc().subtract(1, 'hour').toDate();
    expect(formatRemaining(until)).toBe('00:00');
  });
});
