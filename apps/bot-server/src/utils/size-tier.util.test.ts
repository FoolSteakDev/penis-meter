import { describe, expect, it } from 'vitest';
import { getSizeTierLabel } from './size-tier.util';

describe('getSizeTierLabel', () => {
  it('returns a non-empty label for a typical value', () => {
    const label = getSizeTierLabel(15);
    expect(typeof label).toBe('string');
    expect(label.length).toBeGreaterThan(0);
  });

  it('returns a label for a negative value below the lowest tier', () => {
    const label = getSizeTierLabel(-100);
    expect(typeof label).toBe('string');
    expect(label.length).toBeGreaterThan(0);
  });

  it('handles -Infinity without throwing', () => {
    expect(() => getSizeTierLabel(Number.NEGATIVE_INFINITY)).not.toThrow();
  });

  it('handles the exact tier boundary consistently', () => {
    expect(() => getSizeTierLabel(120)).not.toThrow();
    expect(() => getSizeTierLabel(119.99)).not.toThrow();
  });
});
