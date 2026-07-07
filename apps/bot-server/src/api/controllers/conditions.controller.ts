import { Body, Controller, Delete, Get, Patch, Path, Post, Route, Tags } from 'tsoa';
import { ApiError } from '../apiError';
import { ConditionModel } from '../../database/models/condition.model';
import type { ConditionDto } from '../../dto/condition.dto';
import { mapConditionDocumentToDto } from '../../mappers/condition.mapper';
import { modifierRegistry } from '../../modifiers/modifier.registry';

export interface CreateConditionRequest {
  code: string;
  name: string;
  description?: string | null;
  isEnabled?: boolean;
  chance: number;
  minDelta: number;
  maxDelta: number;
  config?: Record<string, unknown>;
}

export interface UpdateConditionRequest {
  name?: string;
  description?: string | null;
  isEnabled?: boolean;
  chance?: number;
  minDelta?: number;
  maxDelta?: number;
  config?: Record<string, unknown>;
}

@Route('conditions')
@Tags('Conditions')
export class ConditionsController extends Controller {
  @Get()
  public async listConditions(): Promise<ConditionDto[]> {
    const docs = await ConditionModel.find().sort({ created_at: 1 });
    return docs.map(mapConditionDocumentToDto);
  }

  @Get('available-codes')
  public async listAvailableCodes(): Promise<string[]> {
    return Array.from(modifierRegistry.keys());
  }

  @Post()
  public async createCondition(@Body() body: CreateConditionRequest): Promise<ConditionDto> {
    if (!modifierRegistry.has(body.code)) {
      throw new ApiError(400, `No modifier handler registered for code "${body.code}"`);
    }

    const existing = await ConditionModel.findOne({ code: body.code });
    if (existing) {
      throw new ApiError(400, `Condition with code "${body.code}" already exists`);
    }

    const created = await ConditionModel.create({
      code: body.code,
      name: body.name,
      description: body.description ?? null,
      is_enabled: body.isEnabled ?? true,
      chance: body.chance,
      min_delta: body.minDelta,
      max_delta: body.maxDelta,
      config: body.config ?? {},
      is_protected: false,
    });

    this.setStatus(201);
    return mapConditionDocumentToDto(created);
  }

  @Patch('{id}')
  public async updateCondition(@Path() id: string, @Body() body: UpdateConditionRequest): Promise<ConditionDto> {
    const update: Record<string, unknown> = {};
    if (body.name !== undefined) update.name = body.name;
    if (body.description !== undefined) update.description = body.description;
    if (body.isEnabled !== undefined) update.is_enabled = body.isEnabled;
    if (body.chance !== undefined) update.chance = body.chance;
    if (body.minDelta !== undefined) update.min_delta = body.minDelta;
    if (body.maxDelta !== undefined) update.max_delta = body.maxDelta;
    if (body.config !== undefined) update.config = body.config;

    const updated = await ConditionModel.findByIdAndUpdate(id, update, { new: true });
    if (!updated) {
      throw new ApiError(404, 'Condition not found');
    }

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
    this.setStatus(204);
  }
}
