import type { UserDocument, UserHydratedDocument } from '../database/models/user.model';
import type { UserDto } from '../dto/user.dto';

export function mapUserDocumentToDto(doc: UserHydratedDocument | UserDocument): UserDto {
  return {
    id: doc._id.toString(),
    telegramId: doc.telegram_id,
    username: doc.username,
    firstName: doc.first_name,
    value: doc.value,
    lastMeasurementAt: doc.last_measurement_at,
    chats: doc.chats,
    work: {
      schedule: doc.work?.schedule ?? [5, 2],
      lastWeekend: doc.work?.last_weekend ?? null,
    },
    seasonGrowth: doc.season_growth ?? 0,
    roundGrowth: doc.round_growth ?? 0,
    titles: (doc.titles ?? []).map((title) => ({
      seasonNumber: title.season_number,
      rank: title.rank,
      titleCode: title.title_code,
      scope: title.scope,
      chatId: title.chat_id,
      awardedAt: title.awarded_at,
    })),
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
  };
}
