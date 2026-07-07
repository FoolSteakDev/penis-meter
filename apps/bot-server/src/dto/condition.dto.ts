export interface ConditionDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isEnabled: boolean;
  chance: number;
  minDelta: number;
  maxDelta: number;
  config: Record<string, unknown>;
  isProtected: boolean;
  createdAt: Date;
  updatedAt: Date;
}
