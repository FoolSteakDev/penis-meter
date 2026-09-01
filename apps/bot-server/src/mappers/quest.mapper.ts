import type { QuestDocument, QuestHydratedDocument } from '../database/models/quest.model';
import type { QuestSettingsDocument, QuestSettingsHydratedDocument } from '../database/models/quest-settings.model';
import type { QuestDto, QuestRuleDto, QuestSettingsDto } from '../dto/quest.dto';
import type { QuestRule } from '../quests/quest.rules';

export function mapQuestDocumentToDto(
  doc: QuestHydratedDocument | QuestDocument,
  activeAssignments: number,
): QuestDto {
  return {
    id: doc._id.toString(),
    code: doc.code,
    emoji: doc.emoji,
    name: doc.name,
    description: doc.description,
    category: doc.category,
    rule: doc.rule,
    target: doc.target,
    params: doc.params,
    durationMinutes: doc.duration_minutes,
    rewardCm: doc.reward_cm,
    penaltyCm: doc.penalty_cm,
    cooldownHours: doc.cooldown_hours,
    isEnabled: doc.is_enabled,
    sortOrder: doc.sort_order,
    activeAssignments,
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
  };
}

export function mapQuestRuleToDto(rule: QuestRule): QuestRuleDto {
  return {
    code: rule.code,
    label: rule.label,
    kind: rule.kind,
    unit: rule.unit,
    params: rule.params,
  };
}

export function mapQuestSettingsDocumentToDto(
  doc: QuestSettingsHydratedDocument | QuestSettingsDocument,
): QuestSettingsDto {
  return {
    id: doc._id.toString(),
    isEnabled: doc.is_enabled,
    announceEnabled: doc.announce_enabled,
    rewardMultiplier: doc.reward_multiplier,
    penaltyMultiplier: doc.penalty_multiplier,
    maxActiveQuests: doc.max_active_quests,
    reminderBeforeMinutes: doc.reminder_before_minutes,
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
  };
}
