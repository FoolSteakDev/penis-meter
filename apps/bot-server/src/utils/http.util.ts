const DEFAULT_TIMEOUT_MS = 4000;

/**
 * fetch з таймаутом за замовчуванням - без нього зависання зовнішнього API
 * (погода/курси/крипта) вішає весь /metr до дефолтного таймауту Node.
 * AbortSignal.timeout кидає звичайний AbortError, тож існуючі try/catch
 * фолбеки на rollBaseDelta в модифікаторах ловлять і його теж.
 */
export async function fetchJson<T>(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) {
    throw new Error(`Request to ${new URL(url).host} failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}
