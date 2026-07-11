import type { DeltaMode } from '../database/models/condition.model';

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
  createdAt: Date;
  updatedAt: Date;
}
