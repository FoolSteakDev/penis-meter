/** Сантиметри зберігаємо з точністю до сотих - уникає float-хвостів у повідомленнях. */
export function roundCm(value: number): number {
  return Math.round(value * 100) / 100;
}
