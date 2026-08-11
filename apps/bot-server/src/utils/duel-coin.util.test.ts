import { describe, expect, it } from 'vitest';
import { challengerWinsCoinFlip } from './duel-coin.util';

/** mulberry32 - детермінований seeded PRNG, щоб великі вибірки не флейкали. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('challengerWinsCoinFlip', () => {
  it('over 200 000 seeded flips lands within 0.5 ± 0.005', () => {
    const rng = mulberry32(42);
    const n = 200_000;
    let wins = 0;
    for (let i = 0; i < n; i += 1) {
      if (challengerWinsCoinFlip(rng)) {
        wins += 1;
      }
    }
    const rate = wins / n;
    expect(rate).toBeGreaterThan(0.5 - 0.005);
    expect(rate).toBeLessThan(0.5 + 0.005);
  });

  it('consecutive flips are not correlated: P(flip[i] === flip[i+1]) within 0.5 ± 0.01', () => {
    const rng = mulberry32(1337);
    const n = 200_000;
    const flips: boolean[] = [];
    for (let i = 0; i < n; i += 1) {
      flips.push(challengerWinsCoinFlip(rng));
    }
    let matches = 0;
    for (let i = 0; i < flips.length - 1; i += 1) {
      if (flips[i] === flips[i + 1]) {
        matches += 1;
      }
    }
    const rate = matches / (flips.length - 1);
    expect(rate).toBeGreaterThan(0.5 - 0.01);
    expect(rate).toBeLessThan(0.5 + 0.01);
  });

  it('is true exactly for rng() < 0.5, with no off-by-one at the boundary', () => {
    expect(challengerWinsCoinFlip(() => 0)).toBe(true);
    expect(challengerWinsCoinFlip(() => 0.4999)).toBe(true);
    expect(challengerWinsCoinFlip(() => 0.5)).toBe(false);
    expect(challengerWinsCoinFlip(() => 0.9999)).toBe(false);
  });
});
