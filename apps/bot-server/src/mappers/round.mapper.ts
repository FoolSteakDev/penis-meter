import type { RoundDocument, RoundHydratedDocument } from '../database/models/round.model';
import type { RoundDto } from '../dto/round.dto';
import { getCurrentRoundNumber, getRoundInSeason } from '../utils/season-round.util';

export function mapRoundDocumentToDto(doc: RoundHydratedDocument | RoundDocument): RoundDto {
  return {
    id: doc._id.toString(),
    roundNumber: doc.round_number,
    seasonNumber: doc.season_number,
    roundInSeason: getRoundInSeason(doc.round_number),
    startsAt: doc.starts_at,
    endsAt: doc.ends_at,
    themeName: doc.theme_name,
    themeDescription: doc.theme_description,
    conditionCode: doc.condition_code,
    conditionChance: doc.condition_chance,
    themeSource: doc.theme_source,
    isEditable: doc.round_number > getCurrentRoundNumber(),
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
  };
}
