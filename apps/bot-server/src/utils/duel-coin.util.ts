/**
 * Чиста 50/50 монетка дуелі. Винесена окремо СВІДОМО: щоб чесність кидка
 * можна було довести юніт-тестом на великій вибірці, не піднімаючи Mongo.
 * rng інжектується лише для тестів; у проді - Math.random.
 */
export function challengerWinsCoinFlip(rng: () => number = Math.random): boolean {
  return rng() < 0.5;
}
