import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { describe, expect, it } from 'vitest';
import {
  getCurrentRoundNumber,
  getDaysUntil,
  getSeasonBounds,
  isLastRoundOfSeason,
} from './season-round.util';

dayjs.extend(utc);

// Збігається з config/constants.ts::SEASON_START_DATE.
const SEASON_START = '2026-07-13T00:00:00.000Z';

describe('getCurrentRoundNumber', () => {
  it('returns 0 before the season starts', () => {
    expect(getCurrentRoundNumber(dayjs.utc(SEASON_START).subtract(1, 'day'))).toBe(0);
  });

  it('returns 1 on the exact start date', () => {
    expect(getCurrentRoundNumber(dayjs.utc(SEASON_START))).toBe(1);
  });

  it('stays on round 1 through day 6', () => {
    expect(getCurrentRoundNumber(dayjs.utc(SEASON_START).add(6, 'day'))).toBe(1);
  });

  it('rolls over to round 2 on day 7 (round boundary)', () => {
    expect(getCurrentRoundNumber(dayjs.utc(SEASON_START).add(7, 'day'))).toBe(2);
  });

  it('rolls over into season 2 (round 5) on day 28', () => {
    expect(getCurrentRoundNumber(dayjs.utc(SEASON_START).add(28, 'day'))).toBe(5);
  });
});

describe('isLastRoundOfSeason', () => {
  it('is true for round 4 (last of season 1)', () => {
    expect(isLastRoundOfSeason(4)).toBe(true);
  });

  it('is false for round 1', () => {
    expect(isLastRoundOfSeason(1)).toBe(false);
  });

  it('is true for round 8 (last of season 2)', () => {
    expect(isLastRoundOfSeason(8)).toBe(true);
  });
});

describe('getSeasonBounds', () => {
  it('spans exactly 4 rounds (28 days) for season 1', () => {
    const { startsAt, endsAt } = getSeasonBounds(1);
    expect(startsAt.toISOString()).toBe(dayjs.utc(SEASON_START).toISOString());
    expect(dayjs.utc(endsAt).diff(dayjs.utc(startsAt), 'day')).toBe(28);
  });

  it('season 2 starts exactly where season 1 ends', () => {
    const season1 = getSeasonBounds(1);
    const season2 = getSeasonBounds(2);
    expect(season2.startsAt.toISOString()).toBe(season1.endsAt.toISOString());
  });
});

describe('getDaysUntil', () => {
  it('rounds up partial days', () => {
    const future = dayjs.utc().add(25, 'hour').toDate();
    expect(getDaysUntil(future)).toBe(2);
  });

  it('never returns a negative number for a past date', () => {
    const past = dayjs.utc().subtract(1, 'day').toDate();
    expect(getDaysUntil(past)).toBe(0);
  });
});
