import { describe, expect, it } from 'vitest';
import { rollBaseDelta } from './delta-roll.util';

describe('rollBaseDelta', () => {
  it('falls back to range when fixed_list is chosen but fixedValues is empty', () => {
    // minDelta === maxDelta -> детерміновано, без потреби мокати Math.random.
    const delta = rollBaseDelta({ deltaMode: 'fixed_list', minDelta: 5, maxDelta: 5, fixedValues: [] });
    expect(delta).toBe(5);
  });

  it('picks a value from fixedValues when the list is non-empty', () => {
    const delta = rollBaseDelta({ deltaMode: 'fixed_list', minDelta: 0, maxDelta: 0, fixedValues: [1, 2, 3] });
    expect([1, 2, 3]).toContain(delta);
  });

  it('rolls within [minDelta, maxDelta] for range mode', () => {
    for (let i = 0; i < 100; i += 1) {
      const delta = rollBaseDelta({ deltaMode: 'range', minDelta: -2, maxDelta: 3, fixedValues: [] });
      expect(delta).toBeGreaterThanOrEqual(-2);
      expect(delta).toBeLessThanOrEqual(3);
    }
  });
});
