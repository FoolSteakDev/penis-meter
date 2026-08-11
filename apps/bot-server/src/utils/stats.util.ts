/**
 * Abramowitz-Stegun 7.1.26 наближення erf. Точність ~1.5e-7 - більш ніж
 * достатньо для звіту "чи це аномалія", а точний erf вимагав би залежності.
 */
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);

  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1 / (1 + p * absX);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
  return sign * y;
}

/** Функція розподілу стандартного нормального розподілу Φ(x). */
export function normalCdf(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

/**
 * Двосторонній p-value для H0: p=0.5 за k успіхів із n спроб. Нормальна
 * апроксимація з поправкою на неперервність - точний біноміальний coeff
 * на n у тисячах переповнює Number у comb() (див. 2.5 плану).
 */
export function twoSidedBinomialP(k: number, n: number): number {
  if (n === 0) {
    return 1;
  }
  const z = (Math.abs(k - n / 2) - 0.5) / (0.5 * Math.sqrt(n));
  const p = 2 * (1 - normalCdf(z));
  return Math.min(1, Math.max(0, p));
}
