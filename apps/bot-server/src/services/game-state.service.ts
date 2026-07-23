import { GameStateModel, type GameStateHydratedDocument } from '../database/models/game-state.model';
import { ROUND_THEMES, type RoundTheme, type ThemeConditionOverride } from '../data/round-themes.data';

export async function getOrCreateGameState(): Promise<GameStateHydratedDocument> {
  const existing = await GameStateModel.findOne();
  if (existing) {
    return existing;
  }
  return GameStateModel.create({});
}

export interface ActiveThemeState {
  current_theme_code: string | null;
  current_theme_name: string | null;
  current_theme_description: string | null;
  current_theme_condition_code: string | null;
  current_theme_condition_chance: number | null;
}

/**
 * Резолвить активну тему раунду з кешу на GameState - адмін-керовану
 * (round.model.ts, кешовану через current_theme_condition_code) якщо є,
 * інакше легасі-тему з пулу ROUND_THEMES за current_theme_code.
 */
export function getActiveTheme(state: ActiveThemeState): RoundTheme | null {
  if (state.current_theme_condition_code) {
    return {
      code: 'admin',
      name: state.current_theme_name ?? '',
      description: state.current_theme_description ?? '',
      overrides: [
        {
          conditionCode: state.current_theme_condition_code,
          chanceOverride: state.current_theme_condition_chance ?? undefined,
        },
      ],
    };
  }
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
