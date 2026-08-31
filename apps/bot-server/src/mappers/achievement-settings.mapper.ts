import type {
  AchievementSettingsDocument,
  AchievementSettingsHydratedDocument,
} from '../database/models/achievement-settings.model';
import type { AchievementDefinitionDto, AchievementSettingsDto } from '../dto/achievement-settings.dto';
import type { AchievementDefinition } from '../achievements/achievement.types';

export function mapAchievementSettingsDocumentToDto(
  doc: AchievementSettingsHydratedDocument | AchievementSettingsDocument,
): AchievementSettingsDto {
  return {
    id: doc._id.toString(),
    isEnabled: doc.is_enabled,
    announceEnabled: doc.announce_enabled,
    rewardMultiplier: doc.reward_multiplier,
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
  };
}

export function mapAchievementDefinitionToDto(def: AchievementDefinition): AchievementDefinitionDto {
  return {
    code: def.code,
    emoji: def.emoji,
    name: def.name,
    hint: def.hint,
    category: def.category,
    unit: def.unit,
    thresholds: [...def.thresholds],
    rewards: [...def.rewards],
  };
}
