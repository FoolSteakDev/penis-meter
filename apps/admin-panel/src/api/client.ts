const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';

export interface UserWorkDto {
  schedule: number[];
  lastWeekend: string | null;
}

export type UserTitleCodeDto = 'champion' | 'silver' | 'bronze' | 'top10';
export type UserTitleScopeDto = 'global' | 'chat';

export interface UserTitleDto {
  seasonNumber: number;
  rank: number;
  titleCode: UserTitleCodeDto;
  scope: UserTitleScopeDto;
  chatId: number | null;
  awardedAt: string;
}

export interface UserDto {
  id: string;
  telegramId: number;
  username: string | null;
  firstName: string;
  value: number;
  lastMeasurementAt: string | null;
  chats: number[];
  work: UserWorkDto;
  seasonGrowth: number;
  roundGrowth: number;
  roundBestDelta: number | null;
  roundMeasurementCount: number;
  titles: UserTitleDto[];
  mode: 'grow' | 'drill';
  modeChangedAt: string | null;
  experience: number;
  streakCurrent: number;
  streakBest: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserRequest {
  value?: number;
  username?: string | null;
  firstName?: string;
  work?: {
    schedule?: number[];
    lastWeekend?: string;
  };
  mode?: 'grow' | 'drill';
}

export interface UsersListResponse {
  items: UserDto[];
  total: number;
  page: number;
  limit: number;
}

export type DeltaMode = 'range' | 'fixed_list';

export interface ConditionDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isEnabled: boolean;
  chance: number;
  minDelta: number;
  maxDelta: number;
  deltaMode: DeltaMode;
  fixedValues: number[];
  config: Record<string, unknown>;
  isProtected: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConditionRequest {
  code: string;
  name: string;
  description?: string | null;
  isEnabled?: boolean;
  chance: number;
  deltaMode?: DeltaMode;
  minDelta?: number;
  maxDelta?: number;
  fixedValues?: number[];
  config?: Record<string, unknown>;
}

export interface UpdateConditionRequest {
  name?: string;
  description?: string | null;
  isEnabled?: boolean;
  chance?: number;
  deltaMode?: DeltaMode;
  minDelta?: number;
  maxDelta?: number;
  fixedValues?: number[];
  config?: Record<string, unknown>;
}

export interface DuelSettingsDto {
  id: string;
  minDelta: number;
  maxDelta: number;
  isEnabled: boolean;
  challengeTtlMinutes: number;
  maxPendingChallenges: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateDuelSettingsRequest {
  minDelta?: number;
  maxDelta?: number;
  isEnabled?: boolean;
  challengeTtlMinutes?: number;
  maxPendingChallenges?: number;
}

export interface AchievementSettingsDto {
  id: string;
  isEnabled: boolean;
  announceEnabled: boolean;
  rewardMultiplier: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateAchievementSettingsRequest {
  isEnabled?: boolean;
  announceEnabled?: boolean;
  rewardMultiplier?: number;
}

export interface AchievementDefinitionDto {
  code: string;
  emoji: string;
  name: string;
  hint: string;
  category: string;
  unit: 'count' | 'cm' | 'days';
  thresholds: number[];
  rewards: number[];
}

export interface ResetAchievementsRequest {
  telegramId?: number;
  keepCounters?: boolean;
}

export interface ResetAchievementsResponse {
  affected: number;
}

export type RoundThemeSource = 'admin' | 'random_fallback' | 'legacy';

export interface RoundDto {
  id: string;
  roundNumber: number;
  seasonNumber: number;
  roundInSeason: number;
  startsAt: string;
  endsAt: string;
  themeName: string | null;
  themeDescription: string | null;
  conditionCode: string | null;
  conditionChance: number | null;
  themeSource: RoundThemeSource | null;
  isEditable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateRoundRequest {
  themeName?: string | null;
  themeDescription?: string | null;
  conditionCode?: string | null;
  conditionChance?: number | null;
}

export type QuestCategory = 'restraint' | 'precision' | 'position' | 'luck' | 'duel';
export type QuestKind = 'reach' | 'avoid' | 'hold';

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
  activeAssignments: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuestRequest {
  code: string;
  emoji?: string;
  name: string;
  description: string;
  category: QuestCategory;
  rule: string;
  target?: number;
  params?: Record<string, unknown>;
  durationMinutes: number;
  rewardCm: number;
  penaltyCm: number;
  cooldownHours?: number;
  isEnabled?: boolean;
  sortOrder?: number;
}

export interface UpdateQuestRequest {
  emoji?: string;
  name?: string;
  description?: string;
  category?: QuestCategory;
  rule?: string;
  target?: number;
  params?: Record<string, unknown>;
  durationMinutes?: number;
  rewardCm?: number;
  penaltyCm?: number;
  cooldownHours?: number;
  isEnabled?: boolean;
  sortOrder?: number;
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
  createdAt: string;
  updatedAt: string;
}

export interface UpdateQuestSettingsRequest {
  isEnabled?: boolean;
  announceEnabled?: boolean;
  rewardMultiplier?: number;
  penaltyMultiplier?: number;
  maxActiveQuests?: number;
  reminderBeforeMinutes?: number;
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

export interface ResetQuestsRequest {
  telegramId?: number;
}

export interface ResetQuestsResponse {
  affected: number;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Request to ${path} failed with ${response.status}: ${body}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  listUsers: (page = 1, limit = 50) =>
    request<UsersListResponse>(`/users?page=${page}&limit=${limit}`),

  updateUser: (id: string, body: UpdateUserRequest) =>
    request<UserDto>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  listConditions: () => request<ConditionDto[]>('/conditions'),

  listAvailableCodes: () => request<string[]>('/conditions/available-codes'),

  createCondition: (body: CreateConditionRequest) =>
    request<ConditionDto>('/conditions', { method: 'POST', body: JSON.stringify(body) }),

  updateCondition: (id: string, body: UpdateConditionRequest) =>
    request<ConditionDto>(`/conditions/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  deleteCondition: (id: string) => request<void>(`/conditions/${id}`, { method: 'DELETE' }),

  getDuelSettings: () => request<DuelSettingsDto>('/duel-settings'),

  updateDuelSettings: (body: UpdateDuelSettingsRequest) =>
    request<DuelSettingsDto>('/duel-settings', { method: 'PATCH', body: JSON.stringify(body) }),

  listRounds: () => request<RoundDto[]>('/rounds'),

  createNextRound: () => request<RoundDto>('/rounds/next', { method: 'POST' }),

  updateRound: (id: string, body: UpdateRoundRequest) =>
    request<RoundDto>(`/rounds/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  getAchievementSettings: () => request<AchievementSettingsDto>('/achievements/settings'),

  updateAchievementSettings: (body: UpdateAchievementSettingsRequest) =>
    request<AchievementSettingsDto>('/achievements/settings', { method: 'PATCH', body: JSON.stringify(body) }),

  getAchievementDefinitions: () => request<AchievementDefinitionDto[]>('/achievements/definitions'),

  resetAchievements: (body: ResetAchievementsRequest) =>
    request<ResetAchievementsResponse>('/achievements/reset', { method: 'POST', body: JSON.stringify(body) }),

  listQuests: () => request<QuestDto[]>('/quests'),

  listQuestRules: () => request<QuestRuleDto[]>('/quests/rules'),

  createQuest: (body: CreateQuestRequest) =>
    request<QuestDto>('/quests', { method: 'POST', body: JSON.stringify(body) }),

  updateQuest: (id: string, body: UpdateQuestRequest) =>
    request<QuestDto>(`/quests/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  deleteQuest: (id: string) => request<void>(`/quests/${id}`, { method: 'DELETE' }),

  getQuestSettings: () => request<QuestSettingsDto>('/quests/settings'),

  updateQuestSettings: (body: UpdateQuestSettingsRequest) =>
    request<QuestSettingsDto>('/quests/settings', { method: 'PATCH', body: JSON.stringify(body) }),

  getQuestStats: () => request<QuestStatsEntryDto[]>('/quests/stats'),

  resetQuests: (body: ResetQuestsRequest) =>
    request<ResetQuestsResponse>('/quests/reset', { method: 'POST', body: JSON.stringify(body) }),
};
