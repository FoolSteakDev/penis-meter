import { Body, Controller, Get, Patch, Path, Post, Route, Tags } from 'tsoa';
import { ApiError } from '../api-error';
import { ConditionModel } from '../../database/models/condition.model';
import { RoundModel } from '../../database/models/round.model';
import type { RoundDto } from '../../dto/round.dto';
import { mapRoundDocumentToDto } from '../../mappers/round.mapper';
import { getCurrentRoundNumber, getRoundBounds, getSeasonNumber } from '../../utils/season-round.util';

export interface UpdateRoundRequest {
  themeName?: string | null;
  themeDescription?: string | null;
  conditionCode?: string | null;
  conditionChance?: number | null;
}

@Route('rounds')
@Tags('Rounds')
export class RoundsController extends Controller {
  @Get()
  public async listRounds(): Promise<RoundDto[]> {
    const docs = await RoundModel.find().sort({ round_number: 1 });
    return docs.map(mapRoundDocumentToDto);
  }

  /** Додає наступний ще не створений раунд з порожньою темою й обчисленими датами. */
  @Post('next')
  public async createNextRound(): Promise<RoundDto> {
    const lastDoc = await RoundModel.findOne().sort({ round_number: -1 });
    const roundNumber = Math.max(lastDoc?.round_number ?? 0, getCurrentRoundNumber()) + 1;

    const existing = await RoundModel.findOne({ round_number: roundNumber });
    if (existing) {
      throw new ApiError(409, `Round ${roundNumber} already exists`);
    }

    const { startsAt, endsAt } = getRoundBounds(roundNumber);
    const created = await RoundModel.create({
      round_number: roundNumber,
      season_number: getSeasonNumber(roundNumber),
      starts_at: startsAt,
      ends_at: endsAt,
      theme_source: null,
    });

    this.setStatus(201);
    return mapRoundDocumentToDto(created);
  }

  @Patch('{id}')
  public async updateRound(@Path() id: string, @Body() body: UpdateRoundRequest): Promise<RoundDto> {
    const existing = await RoundModel.findById(id);
    if (!existing) {
      throw new ApiError(404, 'Round not found');
    }

    if (existing.round_number <= getCurrentRoundNumber()) {
      throw new ApiError(409, 'Cannot edit a round that has already started');
    }

    if (body.conditionCode) {
      const condition = await ConditionModel.exists({ code: body.conditionCode });
      if (!condition) {
        throw new ApiError(400, `Condition with code "${body.conditionCode}" does not exist`);
      }
    }

    if (body.themeName !== undefined) existing.theme_name = body.themeName;
    if (body.themeDescription !== undefined) existing.theme_description = body.themeDescription;
    if (body.conditionCode !== undefined) existing.condition_code = body.conditionCode;
    if (body.conditionChance !== undefined) existing.condition_chance = body.conditionChance;

    existing.theme_source = existing.condition_code ? 'admin' : null;

    await existing.save();
    return mapRoundDocumentToDto(existing);
  }
}
