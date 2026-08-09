import { Body, Controller, Delete, Get, Patch, Path, Post, Route, Tags } from 'tsoa';
import { ApiError } from '../api-error';
import { ConditionModel, type DeltaMode } from '../../database/models/condition.model';
import type { ConditionDto } from '../../dto/condition.dto';
import { mapConditionDocumentToDto } from '../../mappers/condition.mapper';
import { modifierRegistry } from '../../modifiers/modifier.registry';
import { invalidateConditionsCache } from '../../services/measurement.service';

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

const CODE_PATTERN = /^[a-z][a-z0-9_]*$/;

function isValidFixedValues(values: unknown): values is number[] {
  return Array.isArray(values) && values.length > 0 && values.every((v) => typeof v === 'number' && Number.isFinite(v));
}

@Route('conditions')
@Tags('Conditions')
export class ConditionsController extends Controller {
  @Get()
  public async listConditions(): Promise<ConditionDto[]> {
    const docs = await ConditionModel.find().sort({ created_at: 1 });
    return docs.map(mapConditionDocumentToDto);
  }

  /**
   * Коди, для яких у коді бота є спеціальний handler (погода, дуель тощо).
   * Будь-який інший `code` теж можна використати при створенні умови - тоді
   * вона працюватиме як звичайний рандом у [minDelta, maxDelta] без спецлогіки.
   */
  @Get('available-codes')
  public async listAvailableCodes(): Promise<string[]> {
    return Array.from(modifierRegistry.keys());
  }

  @Post()
  public async createCondition(@Body() body: CreateConditionRequest): Promise<ConditionDto> {
    if (!CODE_PATTERN.test(body.code)) {
      throw new ApiError(
        400,
        'Code must start with a lowercase letter and contain only lowercase letters, digits and underscores',
      );
    }

    const existing = await ConditionModel.findOne({ code: body.code });
    if (existing) {
      throw new ApiError(400, `Condition with code "${body.code}" already exists`);
    }

    const deltaMode = body.deltaMode ?? 'range';
    if (deltaMode === 'fixed_list') {
      if (!isValidFixedValues(body.fixedValues)) {
        throw new ApiError(400, 'fixedValues must be a non-empty array of numbers for the fixed_list delta mode');
      }
    } else if (body.minDelta === undefined || body.maxDelta === undefined) {
      throw new ApiError(400, 'minDelta and maxDelta are required for the range delta mode');
    }

    const created = await ConditionModel.create({
      code: body.code,
      name: body.name,
      description: body.description ?? null,
      is_enabled: body.isEnabled ?? true,
      chance: body.chance,
      delta_mode: deltaMode,
      min_delta: body.minDelta ?? 0,
      max_delta: body.maxDelta ?? 0,
      fixed_values: body.fixedValues ?? [],
      config: body.config ?? {},
      is_protected: false,
    });

    invalidateConditionsCache();
    this.setStatus(201);
    return mapConditionDocumentToDto(created);
  }

  @Patch('{id}')
  public async updateCondition(@Path() id: string, @Body() body: UpdateConditionRequest): Promise<ConditionDto> {
    const existing = await ConditionModel.findById(id);
    if (!existing) {
      throw new ApiError(404, 'Condition not found');
    }

    const resultingDeltaMode = body.deltaMode ?? existing.delta_mode;
    if (resultingDeltaMode === 'fixed_list') {
      const resultingFixedValues = body.fixedValues ?? existing.fixed_values;
      if (!isValidFixedValues(resultingFixedValues)) {
        throw new ApiError(400, 'fixedValues must be a non-empty array of numbers for the fixed_list delta mode');
      }
    } else {
      const resultingMinDelta = body.minDelta ?? existing.min_delta;
      const resultingMaxDelta = body.maxDelta ?? existing.max_delta;
      if (resultingMinDelta === undefined || resultingMaxDelta === undefined) {
        throw new ApiError(400, 'minDelta and maxDelta are required for the range delta mode');
      }
    }

    const update: Record<string, unknown> = {};
    if (body.name !== undefined) update.name = body.name;
    if (body.description !== undefined) update.description = body.description;
    if (body.isEnabled !== undefined) update.is_enabled = body.isEnabled;
    if (body.chance !== undefined) update.chance = body.chance;
    if (body.deltaMode !== undefined) update.delta_mode = body.deltaMode;
    if (body.minDelta !== undefined) update.min_delta = body.minDelta;
    if (body.maxDelta !== undefined) update.max_delta = body.maxDelta;
    if (body.fixedValues !== undefined) update.fixed_values = body.fixedValues;
    if (body.config !== undefined) update.config = body.config;

    const updated = await ConditionModel.findByIdAndUpdate(id, update, { new: true });
    if (!updated) {
      throw new ApiError(404, 'Condition not found');
    }

    invalidateConditionsCache();
    return mapConditionDocumentToDto(updated);
  }

  @Delete('{id}')
  public async deleteCondition(@Path() id: string): Promise<void> {
    const condition = await ConditionModel.findById(id);
    if (!condition) {
      throw new ApiError(404, 'Condition not found');
    }

    if (condition.is_protected) {
      throw new ApiError(409, 'Cannot delete a protected condition');
    }

    await condition.deleteOne();
    invalidateConditionsCache();
    this.setStatus(204);
  }
}
