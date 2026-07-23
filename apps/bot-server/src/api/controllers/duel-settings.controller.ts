import { Body, Get, Patch, Route, Tags, Controller } from 'tsoa';
import { getDuelSettings } from '../../services/duel.service';
import type { DuelSettingsDto } from '../../dto/duel-settings.dto';
import { mapDuelSettingsDocumentToDto } from '../../mappers/duel-settings.mapper';

export interface UpdateDuelSettingsRequest {
  minDelta?: number;
  maxDelta?: number;
  isEnabled?: boolean;
}

@Route('duel-settings')
@Tags('DuelSettings')
export class DuelSettingsController extends Controller {
  @Get()
  public async getDuelSettings(): Promise<DuelSettingsDto> {
    const settings = await getDuelSettings();
    return mapDuelSettingsDocumentToDto(settings);
  }

  @Patch()
  public async updateDuelSettings(@Body() body: UpdateDuelSettingsRequest): Promise<DuelSettingsDto> {
    const settings = await getDuelSettings();
    if (body.minDelta !== undefined) settings.min_delta = body.minDelta;
    if (body.maxDelta !== undefined) settings.max_delta = body.maxDelta;
    if (body.isEnabled !== undefined) settings.is_enabled = body.isEnabled;
    await settings.save();
    return mapDuelSettingsDocumentToDto(settings);
  }
}
