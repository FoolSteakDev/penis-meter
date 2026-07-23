import dayjs, { type Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { ROUND_LENGTH_DAYS, ROUNDS_PER_SEASON, SEASON_START_DATE } from '../config/constants';
import { nowUtc } from './date.util';

dayjs.extend(utc);

function seasonStart(): Dayjs {
  return dayjs.utc(SEASON_START_DATE);
}

/**
 * Номер поточного раунду - наскрізна нумерація через усі сезони (1, 2, 3...).
 * 0 означає, що сезон ще не почався (SEASON_START_DATE в майбутньому).
 */
export function getCurrentRoundNumber(at: Dayjs = nowUtc()): number {
  const daysSinceStart = at.startOf('day').diff(seasonStart().startOf('day'), 'day');
  if (daysSinceStart < 0) {
    return 0;
  }
  return Math.floor(daysSinceStart / ROUND_LENGTH_DAYS) + 1;
}

export function getSeasonNumber(roundNumber: number): number {
  if (roundNumber <= 0) {
    return 0;
  }
  return Math.floor((roundNumber - 1) / ROUNDS_PER_SEASON) + 1;
}

export function getRoundInSeason(roundNumber: number): number {
  if (roundNumber <= 0) {
    return 0;
  }
  return ((roundNumber - 1) % ROUNDS_PER_SEASON) + 1;
}

export function isLastRoundOfSeason(roundNumber: number): boolean {
  return roundNumber > 0 && getRoundInSeason(roundNumber) === ROUNDS_PER_SEASON;
}

export function getRoundBounds(roundNumber: number): { startsAt: Date; endsAt: Date } {
  const startsAt = seasonStart().add((roundNumber - 1) * ROUND_LENGTH_DAYS, 'day');
  const endsAt = startsAt.add(ROUND_LENGTH_DAYS, 'day');
  return { startsAt: startsAt.toDate(), endsAt: endsAt.toDate() };
}

/** Перший і останній раунд сезону - зручно для меж сезону і для вибірки summary. */
export function getSeasonRoundRange(seasonNumber: number): { firstRound: number; lastRound: number } {
  const firstRound = (seasonNumber - 1) * ROUNDS_PER_SEASON + 1;
  return { firstRound, lastRound: firstRound + ROUNDS_PER_SEASON - 1 };
}

export function getSeasonBounds(seasonNumber: number): { startsAt: Date; endsAt: Date } {
  const { firstRound, lastRound } = getSeasonRoundRange(seasonNumber);
  return {
    startsAt: getRoundBounds(firstRound).startsAt,
    endsAt: getRoundBounds(lastRound).endsAt,
  };
}

export interface CurrentRoundInfo {
  roundNumber: number;
  seasonNumber: number;
  roundInSeason: number;
  bounds: { startsAt: Date; endsAt: Date } | null;
}

export function getCurrentRoundInfo(at: Dayjs = nowUtc()): CurrentRoundInfo {
  const roundNumber = getCurrentRoundNumber(at);
  return {
    roundNumber,
    seasonNumber: getSeasonNumber(roundNumber),
    roundInSeason: getRoundInSeason(roundNumber),
    bounds: roundNumber > 0 ? getRoundBounds(roundNumber) : null,
  };
}

export function getDaysUntil(date: Date): number {
  return Math.max(0, Math.ceil(dayjs.utc(date).diff(nowUtc(), 'hour', true) / 24));
}
