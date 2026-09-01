import { roundCm } from './number.util';
import type { StakeBounds } from '../services/duel.service';

export interface RematchStake {
  stake: number;
  /** true - минулу ставку не потягнули, зрізали до стелі. */
  reduced: boolean;
}

/**
 * «Та сама ставка, або максимально можлива, якщо в когось не вистачає».
 * bounds уже враховують ОБОХ учасників (min їхніх прогресів), тож окремо
 * перевіряти, у кого саме не вистачає, не треба.
 */
export function resolveRematchStake(baseStake: number, bounds: StakeBounds): RematchStake {
  const stake = roundCm(Math.min(Math.max(baseStake, bounds.min), bounds.max));
  return { stake, reduced: stake < roundCm(baseStake) };
}
