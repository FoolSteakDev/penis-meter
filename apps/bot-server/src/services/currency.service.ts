import type { Dayjs } from 'dayjs';
import { nowUtc } from '../utils/date.util';

export interface UsdRateChange {
  currentRate: number;
  previousRate: number;
  changePercent: number;
}

async function fetchUsdRateForDate(date: Dayjs): Promise<number | null> {
  const dateParam = date.format('YYYYMMDD');
  const url = `https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=USD&date=${dateParam}&json`;
  const response = await fetch(url);
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as Array<{ rate: number }>;
  return data[0]?.rate ?? null;
}

async function fetchMostRecentUsdRate(startDate: Dayjs, maxLookbackDays: number): Promise<{ rate: number; date: Dayjs } | null> {
  let date = startDate;
  for (let i = 0; i < maxLookbackDays; i += 1) {
    const rate = await fetchUsdRateForDate(date);
    if (rate !== null) {
      return { rate, date };
    }
    date = date.subtract(1, 'day');
  }
  return null;
}

export async function getUsdRateChange(): Promise<UsdRateChange> {
  const current = await fetchMostRecentUsdRate(nowUtc(), 5);
  if (!current) {
    throw new Error('Could not fetch current USD/UAH rate from NBU');
  }

  const previous = await fetchMostRecentUsdRate(current.date.subtract(1, 'day'), 5);
  if (!previous) {
    throw new Error('Could not fetch previous USD/UAH rate from NBU');
  }

  const changePercent = ((current.rate - previous.rate) / previous.rate) * 100;

  return {
    currentRate: current.rate,
    previousRate: previous.rate,
    changePercent,
  };
}
