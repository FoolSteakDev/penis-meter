import type { Dayjs } from 'dayjs';
import { GameStateModel, type GameStateHydratedDocument } from '../database/models/gameState.model';
import { ROUND_THEMES, type RoundTheme, type ThemeConditionOverride } from '../data/roundThemes.data';
import { nowUtc } from '../utils/date.util';
import { getCurrentRoundNumber } from '../utils/seasonRound.util';

export async function getOrCreateGameState(): Promise<GameStateHydratedDocument> {
  const existing = await GameStateModel.findOne();
  if (existing) {
    return existing;
  }
  return GameStateModel.create({});
}

function pickRandomTheme(): RoundTheme {
  return ROUND_THEMES[Math.floor(Math.random() * ROUND_THEMES.length)];
}

/**
 * Гарантує, що для поточного раунду вже обрана тема (чистий рандом, один
 * раз на раунд). Ідемпотентно - можна безпечно викликати і з крон-джоби, і
 * "ліниво" з команд/вимірювання, якщо крон ще не встиг спрацювати цього
 * раунду.
 */
export async function ensureRoundInitialized(at: Dayjs = nowUtc()): Promise<GameStateHydratedDocument> {
  const roundNumber = getCurrentRoundNumber(at);
  const state = await getOrCreateGameState();

  if (roundNumber > 0 && state.current_theme_round_number !== roundNumber) {
    const theme = pickRandomTheme();
    state.current_theme_code = theme.code;
    state.current_theme_round_number = roundNumber;
    await state.save();
  }

  return state;
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
