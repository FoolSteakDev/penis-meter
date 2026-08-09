interface CacheEntry<T> {
  promise: Promise<T>;
  expiresAt: number;
}

/**
 * Мінімальний in-memory TTL-кеш. Зберігає ПРОМІС, що виконується, а не лише
 * готовий результат - інакше N паралельних вимірів, що зачепили той самий
 * ключ до першого resolve, породили б N однакових запитів (single-flight).
 * Помилки не кешуються - тимчасовий збій апстріму не має залипати на весь TTL.
 */
export function createTtlCache<T>(ttlMs: number) {
  const store = new Map<string, CacheEntry<T>>();

  return {
    async resolve(key: string, load: () => Promise<T>): Promise<T> {
      const now = Date.now();
      const existing = store.get(key);
      if (existing && existing.expiresAt > now) {
        return existing.promise;
      }

      const promise = load();
      store.set(key, { promise, expiresAt: now + ttlMs });

      try {
        return await promise;
      } catch (error) {
        store.delete(key);
        throw error;
      }
    },
  };
}
