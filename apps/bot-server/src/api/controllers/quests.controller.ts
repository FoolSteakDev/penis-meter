import { Body, Controller, Delete, Get, Patch, Path, Post, Route, Tags } from 'tsoa';
import { ApiError } from '../api-error';
import { QuestModel, type QuestCategory } from '../../database/models/quest.model';
import type { QuestDto, QuestRuleDto, QuestSettingsDto, QuestStatsEntryDto } from '../../dto/quest.dto';
import { mapQuestDocumentToDto, mapQuestRuleToDto, mapQuestSettingsDocumentToDto } from '../../mappers/quest.mapper';
import { getQuestSettings, invalidateQuestSettingsCache } from '../../quests/quest-settings.service';
import { getQuestRule, QUEST_RULES } from '../../quests/quest.rules';
import {
  countActiveAssignmentsByCode,
  countActiveAssignmentsGrouped,
  getQuestStats,
  resetQuestCounters,
} from '../../quests/quest.service';
import { getUserByTelegramId } from '../../services/user.service';

const QUEST_CODE_PATTERN = /^[a-z][a-z0-9_]{1,23}$/;
const QUEST_CATEGORIES: QuestCategory[] = ['restraint', 'precision', 'position', 'luck', 'duel'];
const DURATION_MINUTES_RANGE = { min: 5, max: 30 * 24 * 60 };
const MULTIPLIER_RANGE = { min: 0, max: 5 };

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

export interface UpdateQuestSettingsRequest {
  isEnabled?: boolean;
  announceEnabled?: boolean;
  rewardMultiplier?: number;
  penaltyMultiplier?: number;
  maxActiveQuests?: number;
  reminderBeforeMinutes?: number;
}

export interface ResetQuestsRequest {
  /** Кому скидати. Не передано - всім. */
  telegramId?: number;
}

export interface ResetQuestsResponse {
  affected: number;
}

/** Кидає ApiError(400), якщо params не покриває всі required-параметри правила з правильними типами. */
function validateParams(ruleCode: string, params: Record<string, unknown>): void {
  const rule = getQuestRule(ruleCode);
  if (!rule) {
    throw new ApiError(400, `Невідоме правило "${ruleCode}"`);
  }
  for (const param of rule.params) {
    const value = params[param.key];
    if (value === undefined) {
      if (param.required) {
        throw new ApiError(400, `Правило "${ruleCode}" вимагає параметр "${param.key}"`);
      }
      continue;
    }
    if (param.type === 'number' && typeof value !== 'number') {
      throw new ApiError(400, `Параметр "${param.key}" правила "${ruleCode}" має бути числом`);
    }
    if (param.type === 'string_list' && !(Array.isArray(value) && value.every((v) => typeof v === 'string'))) {
      throw new ApiError(400, `Параметр "${param.key}" правила "${ruleCode}" має бути списком рядків`);
    }
  }
}

function validateDurationMinutes(value: number): void {
  const { min, max } = DURATION_MINUTES_RANGE;
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new ApiError(400, `Тривалість має бути в межах [${min}, ${max}] хв`);
  }
}

@Route('quests')
@Tags('Quests')
export class QuestsController extends Controller {
  @Get()
  public async listQuests(): Promise<QuestDto[]> {
    const [quests, activeByCode] = await Promise.all([
      QuestModel.find().sort({ category: 1, sort_order: 1 }),
      countActiveAssignmentsGrouped(),
    ]);
    return quests.map((quest) => mapQuestDocumentToDto(quest, activeByCode.get(quest.code) ?? 0));
  }

  /** Каталог правил для форми в адмінці: код, лейбл, kind, unit, опис params. */
  @Get('rules')
  public async listRules(): Promise<QuestRuleDto[]> {
    return QUEST_RULES.map(mapQuestRuleToDto);
  }

  @Get('settings')
  public async getSettings(): Promise<QuestSettingsDto> {
    return mapQuestSettingsDocumentToDto(await getQuestSettings());
  }

  @Patch('settings')
  public async updateSettings(@Body() body: UpdateQuestSettingsRequest): Promise<QuestSettingsDto> {
    for (const [label, value] of [
      ['rewardMultiplier', body.rewardMultiplier],
      ['penaltyMultiplier', body.penaltyMultiplier],
    ] as const) {
      if (value === undefined) continue;
      const { min, max } = MULTIPLIER_RANGE;
      if (!Number.isFinite(value) || value < min || value > max) {
        throw new ApiError(400, `${label} має бути числом у межах [${min}, ${max}]`);
      }
    }
    if (body.maxActiveQuests !== undefined && (!Number.isInteger(body.maxActiveQuests) || body.maxActiveQuests < 0)) {
      throw new ApiError(400, 'maxActiveQuests має бути цілим числом >= 0');
    }
    if (
      body.reminderBeforeMinutes !== undefined &&
      (!Number.isInteger(body.reminderBeforeMinutes) || body.reminderBeforeMinutes < 0)
    ) {
      throw new ApiError(400, 'reminderBeforeMinutes має бути цілим числом >= 0');
    }

    const settings = await getQuestSettings();
    if (body.isEnabled !== undefined) settings.is_enabled = body.isEnabled;
    if (body.announceEnabled !== undefined) settings.announce_enabled = body.announceEnabled;
    if (body.rewardMultiplier !== undefined) settings.reward_multiplier = body.rewardMultiplier;
    if (body.penaltyMultiplier !== undefined) settings.penalty_multiplier = body.penaltyMultiplier;
    if (body.maxActiveQuests !== undefined) settings.max_active_quests = body.maxActiveQuests;
    if (body.reminderBeforeMinutes !== undefined) settings.reminder_before_minutes = body.reminderBeforeMinutes;
    await settings.save();
    invalidateQuestSettingsCache();

    return mapQuestSettingsDocumentToDto(settings);
  }

  @Get('stats')
  public async getStats(): Promise<QuestStatsEntryDto[]> {
    return getQuestStats();
  }

  @Post('reset')
  public async reset(@Body() body: ResetQuestsRequest): Promise<ResetQuestsResponse> {
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

    const affected = await resetQuestCounters(telegramId);
    return { affected };
  }

  @Post()
  public async createQuest(@Body() body: CreateQuestRequest): Promise<QuestDto> {
    if (!QUEST_CODE_PATTERN.test(body.code)) {
      throw new ApiError(400, 'code має починатись з малої літери й містити лише малі літери, цифри та підкреслення');
    }
    if (!QUEST_CATEGORIES.includes(body.category)) {
      throw new ApiError(400, `category має бути одним із: ${QUEST_CATEGORIES.join(', ')}`);
    }
    const existing = await QuestModel.findOne({ code: body.code });
    if (existing) {
      throw new ApiError(400, `Квест із кодом "${body.code}" уже існує`);
    }
    validateDurationMinutes(body.durationMinutes);
    if (!(body.rewardCm > 0)) {
      throw new ApiError(400, 'rewardCm має бути більшим за 0');
    }
    if (!(body.penaltyCm >= 0)) {
      throw new ApiError(400, 'penaltyCm має бути не менше 0');
    }
    validateParams(body.rule, body.params ?? {});

    const created = await QuestModel.create({
      code: body.code,
      emoji: body.emoji ?? '🧭',
      name: body.name,
      description: body.description,
      category: body.category,
      rule: body.rule,
      target: body.target ?? 1,
      params: body.params ?? {},
      duration_minutes: body.durationMinutes,
      reward_cm: body.rewardCm,
      penalty_cm: body.penaltyCm,
      cooldown_hours: body.cooldownHours ?? 24,
      is_enabled: body.isEnabled ?? true,
      sort_order: body.sortOrder ?? 0,
    });

    this.setStatus(201);
    return mapQuestDocumentToDto(created, 0);
  }

  @Patch('{id}')
  public async updateQuest(@Path() id: string, @Body() body: UpdateQuestRequest): Promise<QuestDto> {
    const existing = await QuestModel.findById(id);
    if (!existing) {
      throw new ApiError(404, 'Квест не знайдено');
    }

    if (body.category !== undefined && !QUEST_CATEGORIES.includes(body.category)) {
      throw new ApiError(400, `category має бути одним із: ${QUEST_CATEGORIES.join(', ')}`);
    }
    if (body.durationMinutes !== undefined) {
      validateDurationMinutes(body.durationMinutes);
    }
    if (body.rewardCm !== undefined && !(body.rewardCm > 0)) {
      throw new ApiError(400, 'rewardCm має бути більшим за 0');
    }
    if (body.penaltyCm !== undefined && !(body.penaltyCm >= 0)) {
      throw new ApiError(400, 'penaltyCm має бути не менше 0');
    }

    const resultingRule = body.rule ?? existing.rule;
    const resultingParams = body.params ?? existing.params;
    validateParams(resultingRule, resultingParams);

    const update: Record<string, unknown> = {};
    if (body.emoji !== undefined) update.emoji = body.emoji;
    if (body.name !== undefined) update.name = body.name;
    if (body.description !== undefined) update.description = body.description;
    if (body.category !== undefined) update.category = body.category;
    if (body.rule !== undefined) update.rule = body.rule;
    if (body.target !== undefined) update.target = body.target;
    if (body.params !== undefined) update.params = body.params;
    if (body.durationMinutes !== undefined) update.duration_minutes = body.durationMinutes;
    if (body.rewardCm !== undefined) update.reward_cm = body.rewardCm;
    if (body.penaltyCm !== undefined) update.penalty_cm = body.penaltyCm;
    if (body.cooldownHours !== undefined) update.cooldown_hours = body.cooldownHours;
    if (body.isEnabled !== undefined) update.is_enabled = body.isEnabled;
    if (body.sortOrder !== undefined) update.sort_order = body.sortOrder;

    const updated = await QuestModel.findByIdAndUpdate(id, update, { new: true });
    if (!updated) {
      throw new ApiError(404, 'Квест не знайдено');
    }

    // Правка визначення НЕ чіпає активні призначення (п.4 «Зафіксованих рішень») -
    // повертаємо їх кількість, щоб адмінка показала «застосується до нових взять».
    const activeAssignments = await countActiveAssignmentsByCode(updated.code);
    return mapQuestDocumentToDto(updated, activeAssignments);
  }

  @Delete('{id}')
  public async deleteQuest(@Path() id: string): Promise<void> {
    const quest = await QuestModel.findById(id);
    if (!quest) {
      throw new ApiError(404, 'Квест не знайдено');
    }

    const activeAssignments = await countActiveAssignmentsByCode(quest.code);
    if (activeAssignments > 0) {
      throw new ApiError(409, `Спершу дочекайся або скинь ${activeAssignments} активних призначень цього квесту`);
    }

    await quest.deleteOne();
    this.setStatus(204);
  }
}
