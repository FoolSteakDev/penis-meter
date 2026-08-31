export interface AchievementSettingsDto {
  id: string;
  isEnabled: boolean;
  announceEnabled: boolean;
  rewardMultiplier: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AchievementDefinitionDto {
  code: string;
  emoji: string;
  name: string;
  hint: string;
  category: string;
  unit: 'count' | 'cm' | 'days';
  /** Завжди рівно 4 елементи (рівні I..IV) - tsoa не вміє кортежі у DTO. */
  thresholds: number[];
  rewards: number[];
}
