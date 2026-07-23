export interface DuelQuestTargetDto {
  target: number;
  rewardCm: number;
}

export interface DuelSettingsDto {
  id: string;
  minDelta: number;
  maxDelta: number;
  isEnabled: boolean;
  questTargets: DuelQuestTargetDto[];
  createdAt: Date;
  updatedAt: Date;
}
