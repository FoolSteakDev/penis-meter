export interface DuelSettingsDto {
  id: string;
  minDelta: number;
  maxDelta: number;
  isEnabled: boolean;
  challengeTtlMinutes: number;
  maxPendingChallenges: number;
  createdAt: Date;
  updatedAt: Date;
}
