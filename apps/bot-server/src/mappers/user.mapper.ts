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
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
  };
}
