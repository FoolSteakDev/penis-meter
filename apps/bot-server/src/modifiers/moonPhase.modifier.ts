import { getCurrentMoonPhase } from '../services/moonPhase.service';
import type { GrowthModifierContext, GrowthModifierHandler, GrowthModifierResult } from './growthModifier.types';

const FULL_MOON_THRESHOLD = 0.85;

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export class MoonPhaseModifier implements GrowthModifierHandler {
  code = 'moon_phase';

  async isEligible(_context: GrowthModifierContext): Promise<boolean> {
    return true;
  }

  async apply(context: GrowthModifierContext): Promise<GrowthModifierResult> {
    const { minDelta, maxDelta } = context.condition;
    const moon = getCurrentMoonPhase();

    const baseDelta = randomInRange(minDelta, maxDelta);
    // чим ближче до повного місяця, тим сильніший позитивний "вовкулаче" бонус
    const bonus = moon.fullness ** 2 * Math.abs(maxDelta) * 0.8;
    const delta = Math.round((baseDelta + bonus) * 100) / 100;

    const message =
      moon.fullness >= FULL_MOON_THRESHOLD
        ? `🌕 ${moon.name}! Вовкулаче зростання цієї ночі неконтрольоване!`
        : `🌗 Фаза Місяця: ${moon.name}.`;

    return { delta, message };
  }
}
