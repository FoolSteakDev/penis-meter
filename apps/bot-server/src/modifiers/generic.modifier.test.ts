import { describe, expect, it } from 'vitest';
import { buildContext } from './test-helpers';
import { genericModifier } from './generic.modifier';

describe('genericModifier', () => {
  it('is always eligible', async () => {
    expect(await genericModifier.isEligible(buildContext())).toBe(true);
  });

  it('uses the condition description as the message when present', async () => {
    const { message } = await genericModifier.apply(buildContext({ description: '  Джекпот!  ' }));
    expect(message).toBe('Джекпот!');
  });

  it('falls back to a default message when description is empty/null', async () => {
    const { message } = await genericModifier.apply(buildContext({ description: null }));
    expect(message).toBe('🎉 Спрацювала особлива умова!');
  });

  it('rolls a delta within [minDelta, maxDelta]', async () => {
    const { delta } = await genericModifier.apply(buildContext({ minDelta: 2, maxDelta: 2 }));
    expect(delta).toBe(2);
  });
});
