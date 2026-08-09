import { describe, expect, it } from 'vitest';
import { buildContext } from './test-helpers';
import { BaseModifier } from './base.modifier';

describe('BaseModifier', () => {
  it('is always eligible', async () => {
    const modifier = new BaseModifier();
    expect(await modifier.isEligible(buildContext())).toBe(true);
  });

  it('rolls a delta within [minDelta, maxDelta]', async () => {
    const modifier = new BaseModifier();
    const { delta } = await modifier.apply(buildContext({ minDelta: -3, maxDelta: 3 }));
    expect(delta).toBeGreaterThanOrEqual(-3);
    expect(delta).toBeLessThanOrEqual(3);
  });
});
