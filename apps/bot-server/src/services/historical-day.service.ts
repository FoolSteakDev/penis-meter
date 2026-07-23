import historicalEventsData from '../data/historicalEvents.json';
import { nowUtc } from '../utils/date.util';

export interface HistoricalEvent {
  month: number;
  day: number;
  event: string;
  text: string;
}

const historicalEvents = historicalEventsData as HistoricalEvent[];

export function getTodayHistoricalEvent(): HistoricalEvent | null {
  const today = nowUtc();
  const month = today.month() + 1;
  const day = today.date();

  return historicalEvents.find((e) => e.month === month && e.day === day) ?? null;
}
