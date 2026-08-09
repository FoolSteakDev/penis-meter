export const UNKNOWN_PLAYER_LABEL = 'Гравець';

export function userLabel(
  u: { username?: string | null; first_name: string } | null | undefined,
): string {
  if (!u) return UNKNOWN_PLAYER_LABEL;
  return u.username ?? u.first_name;
}
