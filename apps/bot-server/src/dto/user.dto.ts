export interface UserWorkDto {
  schedule: number[];
  lastWeekend: Date | null;
}

export type UserTitleCodeDto = 'champion' | 'silver' | 'bronze' | 'top10';
export type UserTitleScopeDto = 'global' | 'chat';

export interface UserTitleDto {
  seasonNumber: number;
  rank: number;
  titleCode: UserTitleCodeDto;
  scope: UserTitleScopeDto;
  chatId: number | null;
  awardedAt: Date;
}

export interface UserDto {
  id: string;
  telegramId: number;
  username: string | null;
  firstName: string;
  value: number;
  lastMeasurementAt: Date | null;
  chats: number[];
  work: UserWorkDto;
  seasonGrowth: number;
  roundGrowth: number;
  roundBestDelta: number | null;
  roundMeasurementCount: number;
  titles: UserTitleDto[];
  mode: 'grow' | 'drill';
  modeChangedAt: Date | null;
  experience: number;
  streakCurrent: number;
  streakBest: number;
  createdAt: Date;
  updatedAt: Date;
}
