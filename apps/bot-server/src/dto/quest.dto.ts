import type { QuestCategory, QuestKind } from '../database/models/quest.model';

export interface QuestDto {
  id: string;
  code: string;
  emoji: string;
  name: string;
  description: string;
  category: QuestCategory;
  rule: string;
  target: number;
  params: Record<string, unknown>;
  durationMinutes: number;
  rewardCm: number;
  penaltyCm: number;
  cooldownHours: number;
  isEnabled: boolean;
  sortOrder: number;
  /** Скільки зараз активних призначень цього визначення - адмінка показує «зміни застосуються до нових взять». */
  activeAssignments: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuestRuleParamDto {
  key: string;
  label: string;
  type: 'number' | 'string_list';
  required: boolean;
  hint?: string;
}

export interface QuestRuleDto {
  code: string;
  label: string;
  kind: QuestKind;
  unit: 'count' | 'cm' | 'none';
  params: QuestRuleParamDto[];
}

export interface QuestSettingsDto {
  id: string;
  isEnabled: boolean;
  announceEnabled: boolean;
  rewardMultiplier: number;
  penaltyMultiplier: number;
  maxActiveQuests: number;
  reminderBeforeMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuestStatsEntryDto {
  code: string;
  emoji: string;
  name: string;
  taken: number;
  completed: number;
  failed: number;
  cancelled: number;
  averageResolutionMinutes: number | null;
}
