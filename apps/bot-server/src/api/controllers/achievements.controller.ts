import { Body, Get, Patch, Post, Route, Tags, Controller } from 'tsoa';
import { ApiError } from '../api-error';
import { getAchievementSettings, invalidateAchievementSettingsCache } from '../../achievements/achievement-settings.service';
import { resetAchievements } from '../../achievements/achievement.service';
import { ACHIEVEMENTS } from '../../achievements/achievement.registry';
import type { AchievementDefinitionDto, AchievementSettingsDto } from '../../dto/achievement-settings.dto';
import {
  mapAchievementDefinitionToDto,
  mapAchievementSettingsDocumentToDto,
} from '../../mappers/achievement-settings.mapper';
import { getUserByTelegramId } from '../../services/user.service';

export interface UpdateAchievementSettingsRequest {
  isEnabled?: boolean;
  announceEnabled?: boolean;
  rewardMultiplier?: number;
}

export interface ResetAchievementsRequest {
  /** Кому скидати. Не передано - всім. */
  telegramId?: number;
  /** true - лишити сирі лічильники, обнулити тільки відкриті рівні (гравці відкриють їх заново і ЗНОВУ отримають см). Дефолт false. */
  keepCounters?: boolean;
}

export interface ResetAchievementsResponse {
  affected: number;
}

const REWARD_MULTIPLIER_RANGE = { min: 0, max: 5 };

@Route('achievements')
@Tags('Achievements')
export class AchievementsController extends Controller {
  @Get('settings')
  public async getSettings(): Promise<AchievementSettingsDto> {
    const settings = await getAchievementSettings();
    return mapAchievementSettingsDocumentToDto(settings);
  }

  @Patch('settings')
  public async updateSettings(@Body() body: UpdateAchievementSettingsRequest): Promise<AchievementSettingsDto> {
    if (body.rewardMultiplier !== undefined) {
      const { min, max } = REWARD_MULTIPLIER_RANGE;
      if (!Number.isFinite(body.rewardMultiplier) || body.rewardMultiplier < min || body.rewardMultiplier > max) {
        throw new ApiError(400, `Множник нагород має бути числом у межах [${min}, ${max}]`);
      }
    }

    const settings = await getAchievementSettings();
    if (body.isEnabled !== undefined) settings.is_enabled = body.isEnabled;
    if (body.announceEnabled !== undefined) settings.announce_enabled = body.announceEnabled;
    if (body.rewardMultiplier !== undefined) settings.reward_multiplier = body.rewardMultiplier;
    await settings.save();
    invalidateAchievementSettingsCache();

    return mapAchievementSettingsDocumentToDto(settings);
  }

  /** Довідник для адмінки: коди, назви, пороги, нагороди. Тільки читання - реєстр у коді. */
  @Get('definitions')
  public async getDefinitions(): Promise<AchievementDefinitionDto[]> {
    return ACHIEVEMENTS.map(mapAchievementDefinitionToDto);
  }

  /** Скидання. Без telegramId - усім гравцям. */
  @Post('reset')
  public async reset(@Body() body: ResetAchievementsRequest): Promise<ResetAchievementsResponse> {
    let telegramId: number | null = null;
    if (body.telegramId !== undefined) {
      if (!Number.isInteger(body.telegramId) || body.telegramId <= 0) {
        throw new ApiError(400, 'telegramId має бути цілим числом більше 0');
      }
      const user = await getUserByTelegramId(body.telegramId);
      if (!user) {
        throw new ApiError(400, 'Гравця з таким telegram_id не знайдено');
      }
      telegramId = body.telegramId;
    }

    const affected = await resetAchievements(telegramId, body.keepCounters ?? false);
    return { affected };
  }
}
