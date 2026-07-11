import type { ConditionDocument, ConditionHydratedDocument } from '../database/models/condition.model';
import type { ConditionDto } from '../dto/condition.dto';

export function mapConditionDocumentToDto(
  doc: ConditionHydratedDocument | ConditionDocument,
): ConditionDto {
  return {
    id: doc._id.toString(),
    code: doc.code,
    name: doc.name,
    description: doc.description,
    isEnabled: doc.is_enabled,
    chance: doc.chance,
    minDelta: doc.min_delta,
    maxDelta: doc.max_delta,
    deltaMode: doc.delta_mode,
    fixedValues: doc.fixed_values,
    config: doc.config,
    isProtected: doc.is_protected,
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
  };
}
