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
    const { minDelta, maxDelta } = context.condition;
    const moon = getCurrentMoonPhase();

    const baseDelta = rollBaseDelta(context.condition);
    // -1 (молодик) .. +1 (повний місяць) - симетрично навколо півмісяця,
    // на відміну від старої версії, де бонус був завжди в плюс і умова не
    // мала жодного ризику.
    const influence = (moon.fullness - 0.5) * 2;
    const swing = influence >= 0 ? Math.abs(maxDelta) : Math.abs(minDelta);
    // influence * Math.abs(influence) зберігає квадратичну криву старої
    // версії, але з правильним знаком.
    const bonus = influence * Math.abs(influence) * swing * 0.5;
    const rawDelta = baseDelta + bonus;
    const delta = Math.round(Math.min(maxDelta, Math.max(minDelta, rawDelta)) * 100) / 100;

    const message =
      moon.fullness >= FULL_MOON_THRESHOLD
        ? `🌕 ${moon.name}! Вовкулаче зростання цієї ночі неконтрольоване!`
        : moon.fullness <= 1 - FULL_MOON_THRESHOLD
          ? `🌑 ${moon.name} - енергії обмаль.`
          : `🌗 Зараз ${moon.name.toLowerCase()}.`;

    return { delta, message };
  }
}
