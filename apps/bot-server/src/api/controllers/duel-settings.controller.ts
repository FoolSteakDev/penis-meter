import { Body, Get, Patch, Route, Tags, Controller } from 'tsoa';
import { ApiError } from '../api-error';
import { getDuelSettings } from '../../services/duel.service';
import type { DuelQuestTargetDto, DuelSettingsDto } from '../../dto/duel-settings.dto';
import { mapDuelSettingsDocumentToDto } from '../../mappers/duel-settings.mapper';

export interface UpdateDuelSettingsRequest {
  minDelta?: number;
  maxDelta?: number;
  isEnabled?: boolean;
  questTargets?: DuelQuestTargetDto[];
  challengeTtlMinutes?: number;
  maxPendingChallenges?: number;
}

const CHALLENGE_TTL_MINUTES_RANGE = { min: 5, max: 10080 };
const MAX_PENDING_CHALLENGES_RANGE = { min: 1, max: 20 };

function validateIntegerInRange(value: number, range: { min: number; max: number }, label: string): void {
  if (!Number.isInteger(value) || value < range.min || value > range.max) {
    throw new ApiError(400, `${label} має бути цілим числом у межах [${range.min}, ${range.max}]`);
  }
}

function validateQuestTargets(questTargets: DuelQuestTargetDto[]): void {
  const seenTargets = new Set<number>();
  for (const entry of questTargets) {
    if (!Number.isInteger(entry.target) || entry.target <= 0) {
      throw new ApiError(400, 'Кожен стрік має мати ціль перемог - ціле число більше 0');
    }
    if (!Number.isFinite(entry.rewardCm) || entry.rewardCm < 0) {
      throw new ApiError(400, 'Нагорода за стрік має бути числом не менше 0');
    }
    if (seenTargets.has(entry.target)) {
      throw new ApiError(400, `Ціль перемог ${entry.target} вже є в списку - дублікати заборонені`);
    }
    seenTargets.add(entry.target);
  }
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
    if (body.questTargets !== undefined) {
      validateQuestTargets(body.questTargets);
    }
    if (body.challengeTtlMinutes !== undefined) {
      validateIntegerInRange(body.challengeTtlMinutes, CHALLENGE_TTL_MINUTES_RANGE, 'Строк дії виклику (хв)');
    }
    if (body.maxPendingChallenges !== undefined) {
      validateIntegerInRange(body.maxPendingChallenges, MAX_PENDING_CHALLENGES_RANGE, 'Ліміт одночасних викликів');
    }

    const settings = await getDuelSettings();
    if (body.minDelta !== undefined) settings.min_delta = body.minDelta;
    if (body.maxDelta !== undefined) settings.max_delta = body.maxDelta;
    if (body.isEnabled !== undefined) settings.is_enabled = body.isEnabled;
    if (body.questTargets !== undefined) {
      settings.quest_targets = body.questTargets.map((t) => ({ target: t.target, reward_cm: t.rewardCm }));
    }
    if (body.challengeTtlMinutes !== undefined) settings.challenge_ttl_minutes = body.challengeTtlMinutes;
    if (body.maxPendingChallenges !== undefined) settings.max_pending_challenges = body.maxPendingChallenges;
    await settings.save();
    return mapDuelSettingsDocumentToDto(settings);
  }
}
