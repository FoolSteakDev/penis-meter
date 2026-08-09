import type { GrowthModifierContext, GrowthModifierHandler, GrowthModifierResult } from './growth-modifier.types';

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

    // Адмін може виставити діапазон, який лежить цілком у плюсі (minDelta > 0)
    // або цілком у мінусі (maxDelta < 0). Гілки success/fail рахуємо від цих
    // безпечних меж, а не від сирих minDelta/maxDelta - інакше randomInRange
    // отримує min > max і повертає число поза заявленим діапазоном.
    const positiveCeiling = Math.max(maxDelta, 0);
    const negativeFloor = Math.min(minDelta, 0);

    if (positiveCeiling === 0 && negativeFloor === 0) {
      return { delta: 0, message: 'Нічого не відбулось - діапазон умови нульовий.' };
    }

    const isSuccess = negativeFloor === 0 ? true : positiveCeiling === 0 ? false : Math.random() < 0.5;

    const rawDelta = isSuccess
      ? randomInRange(positiveCeiling / 2, positiveCeiling)
      : randomInRange(negativeFloor, negativeFloor / 2);
    const delta = Math.round(Math.min(maxDelta, Math.max(minDelta, rawDelta)) * 100) / 100;

    const message = isSuccess ? pickRandom(CRITICAL_SUCCESS_MESSAGES) : pickRandom(CRITICAL_FAIL_MESSAGES);

    return { delta, message };
  }
}
