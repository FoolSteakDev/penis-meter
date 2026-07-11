const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';

export interface UserWorkDto {
  schedule: number[];
  lastWeekend: string | null;
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
};
