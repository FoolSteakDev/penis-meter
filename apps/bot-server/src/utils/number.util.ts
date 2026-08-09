/** Сантиметри зберігаємо з точністю до сотих - уникає float-хвостів у повідомленнях. */
export function roundCm(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Єдина точка форматування см для ВСІХ повідомлень бота: до десятих, без
 * хвостового ".0" і без "-0". Ніде більше не інтерполювати число напряму.
 */
export function formatCm(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const safe = Object.is(rounded, -0) ? 0 : rounded;
  return Number.isInteger(safe) ? String(safe) : safe.toFixed(1);
}

/** Те саме, але зі знаком "+" для невід'ємних - для дельт і приростів. */
export function formatCmSigned(value: number): string {
  return `${value >= 0 ? '+' : ''}${formatCm(value)}`;
}
