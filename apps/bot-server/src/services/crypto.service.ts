import { fetchJson } from '../utils/http.util';
import { createTtlCache } from '../utils/ttl-cache.util';

export interface BtcPriceChange {
  currentPrice: number;
  previousPrice: number;
  changePercent: number;
}

const ONE_HOUR_MS = 60 * 60 * 1000;
const CRYPTO_CACHE_TTL_MS = 5 * 60 * 1000;
const CRYPTO_CACHE_KEY = 'btc-hourly-change';
const cryptoCache = createTtlCache<BtcPriceChange>(CRYPTO_CACHE_TTL_MS);

async function getBtcHourlyChangeUncached(): Promise<BtcPriceChange> {
  const url = 'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=1';
  const data = await fetchJson<{ prices: [number, number][] }>(url);
  const prices = data.prices;
  if (!prices || prices.length < 2) {
    throw new Error('Not enough BTC price data points from CoinGecko');
  }

  const [nowMs, currentPrice] = prices[prices.length - 1];
  const targetMs = nowMs - ONE_HOUR_MS;

  let closest = prices[0];
  for (const point of prices) {
    if (Math.abs(point[0] - targetMs) < Math.abs(closest[0] - targetMs)) {
      closest = point;
    }
  }
  const previousPrice = closest[1];

  const changePercent = ((currentPrice - previousPrice) / previousPrice) * 100;

  return { currentPrice, previousPrice, changePercent };
}

export async function getBtcHourlyChange(): Promise<BtcPriceChange> {
  return cryptoCache.resolve(CRYPTO_CACHE_KEY, getBtcHourlyChangeUncached);
}
