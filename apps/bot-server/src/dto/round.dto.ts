import type { RoundThemeSource } from '../database/models/round.model';

export interface RoundDto {
  id: string;
  roundNumber: number;
  seasonNumber: number;
  roundInSeason: number;
  startsAt: Date;
  endsAt: Date;
  themeName: string | null;
  themeDescription: string | null;
  conditionCode: string | null;
  conditionChance: number | null;
  themeSource: RoundThemeSource | null;
  /** round_number ще не почався - можна редагувати тему. */
  isEditable: boolean;
  createdAt: Date;
  updatedAt: Date;
}
