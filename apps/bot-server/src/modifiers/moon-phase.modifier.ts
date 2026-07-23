import { getCurrentMoonPhase } from '../services/moon-phase.service';
import { rollBaseDelta } from '../utils/delta-roll.util';
import type { GrowthModifierContext, GrowthModifierHandler, GrowthModifierResult } from './growth-modifier.types';

const FULL_MOON_THRESHOLD = 0.85;

export class MoonPhaseModifier implements GrowthModifierHandler {
  code = 'moon_phase';

  async isEligible(_context: GrowthModifierContext): Promise<boolean> {
    return true;
  }

  async apply(context: GrowthModifierContext): Promise<GrowthModifierResult> {
    const { maxDelta } = context.condition;
    const moon = getCurrentMoonPhase();

    const baseDelta = rollBaseDelta(context.condition);
    // чим ближче до повного місяця, тим сильніший позитивний "вовкулаче" бонус
    const bonus = moon.fullness ** 2 * Math.abs(maxDelta) * 0.8;
    const delta = Math.round((baseDelta + bonus) * 100) / 100;

    const message =
      moon.fullness >= FULL_MOON_THRESHOLD
        ? `🌕 ${moon.name}! Вовкулаче зростання цієї ночі неконтрольоване!`
        : `🌗 Зараз ${moon.name.toLowerCase()}.`;

    return { delta, message };
  }
}
