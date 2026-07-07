import { getBtcHourlyChange, type BtcPriceChange } from '../services/crypto.service';
import type { GrowthModifierContext, GrowthModifierHandler, GrowthModifierResult } from './growthModifier.types';

const SIGNIFICANT_CHANGE_PERCENT = 0.5;

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function adjustDeltaForCrypto(baseDelta: number, changePercent: number, minDelta: number, maxDelta: number): number {
  const magnitude = Math.min(Math.abs(changePercent) / 3, 1);
  let delta = baseDelta;

  if (changePercent > SIGNIFICANT_CHANGE_PERCENT) {
    delta += Math.abs(maxDelta) * magnitude;
  } else if (changePercent < -SIGNIFICANT_CHANGE_PERCENT) {
    delta -= Math.abs(minDelta) * magnitude;
  }

  return Math.round(delta * 100) / 100;
}

function buildFlavorText(priceChange: BtcPriceChange, changePercent: number): string {
  const arrow = changePercent > 0 ? '🚀' : changePercent < 0 ? '💥' : '➡️';
  const changeStr = `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`;

  const joke =
    changePercent > SIGNIFICANT_CHANGE_PERCENT
      ? 'до Місяця! 🌕'
      : changePercent < -SIGNIFICANT_CHANGE_PERCENT
        ? 'ліквідація...'
        : 'штиль на ринку';

  return `${arrow} BTC за годину: ${changeStr} ($${Math.round(priceChange.previousPrice)} → $${Math.round(priceChange.currentPrice)}) - ${joke}`;
}

export class CryptoModifier implements GrowthModifierHandler {
  code = 'crypto';

  async isEligible(_context: GrowthModifierContext): Promise<boolean> {
    return true;
  }

  async apply(context: GrowthModifierContext): Promise<GrowthModifierResult> {
    const { minDelta, maxDelta } = context.condition;

    try {
      const priceChange = await getBtcHourlyChange();
      const baseDelta = randomInRange(minDelta, maxDelta);
      const delta = adjustDeltaForCrypto(baseDelta, priceChange.changePercent, minDelta, maxDelta);
      return {
        delta,
        message: buildFlavorText(priceChange, priceChange.changePercent),
      };
    } catch (error) {
      console.error('[crypto.modifier] failed to fetch BTC price', error);
      const delta = Math.round(randomInRange(minDelta, maxDelta) * 100) / 100;
      return {
        delta,
        message: 'Крипторинок сьогодні непередбачуваний.',
      };
    }
  }
}
