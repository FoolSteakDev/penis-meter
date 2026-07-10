import { GameStateModel, type GameStateHydratedDocument } from '../database/models/gameState.model';
import { ROUND_THEMES, type RoundTheme, type ThemeConditionOverride } from '../data/roundThemes.data';

export async function getOrCreateGameState(): Promise<GameStateHydratedDocument> {
  const existing = await GameStateModel.findOne();
  if (existing) {
    return existing;
  }
  return GameStateModel.create({});
}

export function getActiveTheme(state: { current_theme_code: string | null }): RoundTheme | null {
  if (!state.current_theme_code) {
    return null;
  }
  return ROUND_THEMES.find((theme) => theme.code === state.current_theme_code) ?? null;
}

export function getThemeOverrideForCondition(
  theme: RoundTheme | null,
  conditionCode: string,
): ThemeConditionOverride | null {
  if (!theme) {
    return null;
  }
  return theme.overrides.find((override) => override.conditionCode === conditionCode) ?? null;
}
