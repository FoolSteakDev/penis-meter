import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSizeTierLabel } from './size-tier.util';

// Math.random замокано на 0 -> pickRandom завжди бере перший label тиру,
// що робить getSizeTierLabel детермінованою і дає перевірити саме межі.
beforeEach(() => {
  vi.spyOn(Math, 'random').mockReturnValue(0);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getSizeTierLabel - tier boundaries', () => {
  it.each([
    [120, 'За межами уявного ♾️'],
    [119.99, 'Кінець всесвіту 💥'],
    [90, 'Кінець всесвіту 💥'],
    [89.99, 'Розрив реальності 🌀'],
    [0, 'Мікропеніс'],
    [-0.01, 'Мікропізда (реальна діра)'],
    [-10, 'Мікропізда (реальна діра)'],
    [-10.01, 'Чорна діра 🕳️'],
  ])('value %d -> %s', (value, expected) => {
    expect(getSizeTierLabel(value)).toBe(expected);
  });

  it('handles -Infinity without throwing and returns the lowest tier', () => {
    expect(getSizeTierLabel(Number.NEGATIVE_INFINITY)).toBe('Чорна діра 🕳️');
  });
});
