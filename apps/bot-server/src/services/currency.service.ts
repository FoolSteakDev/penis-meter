import type { Dayjs } from 'dayjs';
import { nowUtc } from '../utils/date.util';
import { fetchJson } from '../utils/http.util';
import { createTtlCache } from '../utils/ttl-cache.util';

export interface UsdRateChange {
  currentRate: number;
  previousRate: number;
  changePercent: number;
}

const MAX_LOOKBACK_DAYS = 3;

async function fetchUsdRateForDate(date: Dayjs): Promise<number | null> {
  const dateParam = date.format('YYYYMMDD');
  const url = `https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=USD&date=${dateParam}&json`;
  try {
    const data = await fetchJson<Array<{ rate: number }>>(url);
    return data[0]?.rate ?? null;
  } catch {
    // Вихідний/святковий день без курсу і мережевий/таймаут-збій трактуємо
    // однаково - як "нема даних на цю дату", лічильник довкола просто пробує
    // на день раніше.
    return null;
  }
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

const CURRENCY_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CURRENCY_CACHE_KEY = 'usd-rate-change';
const currencyCache = createTtlCache<UsdRateChange>(CURRENCY_CACHE_TTL_MS);

async function getUsdRateChangeUncached(): Promise<UsdRateChange> {
  // current і previous шукаємо паралельно (від "сьогодні" і від "вчора"), а
  // не послідовно одне за одним - у гіршому разі 2×MAX_LOOKBACK_DAYS
  // запитів виконуються одночасно, а не до 2×5 послідовних. Компроміс: якщо
  // і сьогодні, і вчора курс не публікувався (рідкісний збіг вихідних),
  // previous і current можуть зійтись на одній даті - тоді просто отримаємо
  // changePercent: 0 замість помилки.
  const [current, previous] = await Promise.all([
    fetchMostRecentUsdRate(nowUtc(), MAX_LOOKBACK_DAYS),
    fetchMostRecentUsdRate(nowUtc().subtract(1, 'day'), MAX_LOOKBACK_DAYS),
  ]);

  if (!current) {
    throw new Error('Could not fetch current USD/UAH rate from NBU');
  }
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

export async function getUsdRateChange(): Promise<UsdRateChange> {
  return currencyCache.resolve(CURRENCY_CACHE_KEY, getUsdRateChangeUncached);
}
