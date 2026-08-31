import type { DuelSettingsDocument, DuelSettingsHydratedDocument } from '../database/models/duel-settings.model';
import type { DuelSettingsDto } from '../dto/duel-settings.dto';

export function mapDuelSettingsDocumentToDto(
  doc: DuelSettingsHydratedDocument | DuelSettingsDocument,
): DuelSettingsDto {
  return {
    id: doc._id.toString(),
    minDelta: doc.min_delta,
    maxDelta: doc.max_delta,
    isEnabled: doc.is_enabled,
    challengeTtlMinutes: doc.challenge_ttl_minutes,
    maxPendingChallenges: doc.max_pending_challenges,
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
  };
}
