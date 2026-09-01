import { describe, expect, it } from 'vitest';
import { resolveRematchStake } from './duel-rematch.util';

describe('resolveRematchStake', () => {
  it('keeps the base stake when it fits within bounds', () => {
    expect(resolveRematchStake(5, { min: 1, max: 30 })).toEqual({ stake: 5, reduced: false });
  });

  it('reduces the stake to the ceiling when the base stake no longer fits', () => {
    expect(resolveRematchStake(30, { min: 1, max: 12 })).toEqual({ stake: 12, reduced: true });
  });

  it('does not flag equality with the ceiling as reduced', () => {
    expect(resolveRematchStake(12, { min: 1, max: 12 })).toEqual({ stake: 12, reduced: false });
  });

  it('raises a below-minimum base stake to the floor without flagging it reduced', () => {
    expect(resolveRematchStake(0.4, { min: 1, max: 30 })).toEqual({ stake: 1, reduced: false });
  });

  it('rounds fractional stakes through roundCm', () => {
    expect(resolveRematchStake(3.55, { min: 1, max: 30 })).toEqual({ stake: 3.55, reduced: false });
  });
});
