import type { DeltaMode } from '../database/models/condition.model';
import { roundCm } from './number.util';

export interface DeltaRollable {
  deltaMode: DeltaMode;
  minDelta: number;
  maxDelta: number;
  fixedValues: number[];
}

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Базовий рандом дельти умови: або рівномірно в [minDelta, maxDelta] (режим
 * 'range'), або одне випадкове число зі списку fixedValues (режим
 * 'fixed_list'). Якщо fixed_list обрано, але список порожній - фолбек на
 * range, бо контролер гарантує непорожній список лише на момент
 * створення/апдейту, а старі документи в БД можуть цього не мати.
 */
export function rollBaseDelta(condition: DeltaRollable): number {
  if (condition.deltaMode === 'fixed_list' && condition.fixedValues.length > 0) {
    const value = condition.fixedValues[Math.floor(Math.random() * condition.fixedValues.length)];
    return roundCm(value);
  }
  return roundCm(randomInRange(condition.minDelta, condition.maxDelta));
}
