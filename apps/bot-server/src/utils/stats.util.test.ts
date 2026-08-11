import { describe, expect, it } from 'vitest';
import { normalCdf, twoSidedBinomialP } from './stats.util';

describe('normalCdf', () => {
  it('matches known Φ(z) values within 1e-4', () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 4);
    expect(normalCdf(1)).toBeCloseTo(0.8413, 4);
    expect(normalCdf(-1)).toBeCloseTo(0.1587, 4);
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 3);
    expect(normalCdf(2)).toBeCloseTo(0.9772, 4);
  });
});

describe('twoSidedBinomialP', () => {
  it('is 1 for k = n/2 (perfectly even split)', () => {
    expect(twoSidedBinomialP(50, 100)).toBeCloseTo(1, 2);
  });

  it('is 1 for n = 0', () => {
    expect(twoSidedBinomialP(0, 0)).toBe(1);
  });

  // Цифри власника з плану (2.1) - жодна вибірка не значуща.
  it('matches the owner-reported p-values from plan section 2.1', () => {
    expect(twoSidedBinomialP(86, 157)).toBeCloseTo(0.264, 2);
    expect(twoSidedBinomialP(31, 70)).toBeCloseTo(0.403, 2);
    expect(twoSidedBinomialP(117, 227)).toBeCloseTo(0.691, 2);
  });

  it('flags an extreme, lopsided result as significant', () => {
    expect(twoSidedBinomialP(90, 100)).toBeLessThan(0.01);
  });
});
