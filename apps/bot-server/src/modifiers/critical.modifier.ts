import type { GrowthModifierContext, GrowthModifierHandler, GrowthModifierResult } from './growthModifier.types';

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

const CRITICAL_SUCCESS_MESSAGES = [
  'КРИТИЧНИЙ УСПІХ! Зірки зійшлись ідеально! 🌟',
  'НЕЙМОВІРНО! Це просто аномалія природи! 🚀',
  'ДЖЕКПОТ! Такого ще ніхто не бачив! 🎰',
];

const CRITICAL_FAIL_MESSAGES = [
  'КРИТИЧНИЙ ПРОВАЛ... Краще б сьогодні не вимірювався. 💀',
  'ЩОСЬ ПІШЛО НЕ ТАК. Дуже не так. 📉',
  'КАТАСТРОФА. Навіть статистика плаче. 😱',
];

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export class CriticalModifier implements GrowthModifierHandler {
  code = 'critical';

  async isEligible(_context: GrowthModifierContext): Promise<boolean> {
    return true;
  }

  async apply(context: GrowthModifierContext): Promise<GrowthModifierResult> {
    const { minDelta, maxDelta } = context.condition;
    const isSuccess = Math.random() < 0.5;

    const delta = isSuccess
      ? Math.round(randomInRange(Math.max(0, maxDelta) / 2, maxDelta) * 100) / 100
      : Math.round(randomInRange(minDelta, Math.min(0, minDelta) / 2) * 100) / 100;

    const message = isSuccess ? pickRandom(CRITICAL_SUCCESS_MESSAGES) : pickRandom(CRITICAL_FAIL_MESSAGES);

    return { delta, message };
  }
}
