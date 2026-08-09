import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __SIZE_TIERS_FOR_TESTS, getSizeTierLabel } from './size-tier.util';

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
    // Верхній тир ловить усе до +∞.
    [Number.POSITIVE_INFINITY, 'Абсолютний максимум 🔚'],
    [5000, 'Абсолютний максимум 🔚'],
    [1200, 'Абсолютний максимум 🔚'],
    [1199.99, 'Галактичний рівень 🌌'],
    [1000, 'Зоряна величина ⭐'],
    [999.99, 'Міжпланетний масштаб 🪐'],
    [200, 'Двометровий рубіж 📐'],
    [199.99, 'За межами уявного ♾️'],
    [120, 'За межами уявного ♾️'],
    [119.99, 'Кінець всесвіту 💥'],
    [90, 'Кінець всесвіту 💥'],
    [89.99, 'Розрив реальності 🌀'],
    [0, 'Мікропеніс'],
    [-0.01, 'Мікропізда (реальна діра)'],
    [-10, 'Мікропізда (реальна діра)'],
    [-10.01, 'За межами від’ємного ♾️'],
    [-120, 'За межами від’ємного ♾️'],
    [-120.01, 'Двометрова западина 🕳'],
    [-1000, 'Наскрізь 🕳️'],
    [-1199.99, 'Антиматерія 🌀'],
    [-1200, 'Порожнеча з номером 🫥'],
    [-1200.01, 'Чорна діра 🕳️'],
  ])('value %d -> %s', (value, expected) => {
    expect(getSizeTierLabel(value)).toBe(expected);
  });

  it('handles -Infinity without throwing and returns the lowest tier', () => {
    expect(getSizeTierLabel(Number.NEGATIVE_INFINITY)).toBe('Чорна діра 🕳️');
  });
});

describe('SIZE_TIERS - table invariants', () => {
  it('is sorted by min descending (інакше find() поверне не той тир)', () => {
    const mins = __SIZE_TIERS_FOR_TESTS.map((t) => t.min);
    expect(mins).toEqual([...mins].sort((a, b) => b - a));
  });

  it('ends with -Infinity so any value matches a tier', () => {
    const last = __SIZE_TIERS_FOR_TESTS[__SIZE_TIERS_FOR_TESTS.length - 1];
    expect(last.min).toBe(Number.NEGATIVE_INFINITY);
  });

  it('has no duplicate min values', () => {
    const mins = __SIZE_TIERS_FOR_TESTS.map((t) => t.min);
    expect(new Set(mins).size).toBe(mins.length);
  });

  it('every tier has at least 10 unique non-empty labels', () => {
    for (const tier of __SIZE_TIERS_FOR_TESTS) {
      expect(tier.labels.length, `tier ${tier.min}`).toBeGreaterThanOrEqual(10);
      expect(new Set(tier.labels).size, `tier ${tier.min} has duplicates`).toBe(tier.labels.length);
      expect(tier.labels.every((l) => l.trim().length > 0), `tier ${tier.min} has empty label`).toBe(true);
    }
  });

  it('has globally unique labels (щоб один текст не з’являвся у двох тирах)', () => {
    const all = __SIZE_TIERS_FOR_TESTS.flatMap((t) => t.labels);
    const seen = new Set<string>();
    const duplicates = all.filter((label) => (seen.has(label) ? true : (seen.add(label), false)));
    expect(duplicates).toEqual([]);
  });

  it('returns every label of a tier across the full random range', () => {
    vi.restoreAllMocks();
    const tier = __SIZE_TIERS_FOR_TESTS.find((t) => t.min === 13);
    expect(tier).toBeDefined();
    const produced = new Set<string>();
    for (let i = 0; i < tier!.labels.length; i += 1) {
      vi.spyOn(Math, 'random').mockReturnValue(i / tier!.labels.length);
      produced.add(getSizeTierLabel(13));
    }
    expect(produced.size).toBe(tier!.labels.length);
  });
});
