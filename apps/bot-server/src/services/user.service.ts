import { DEFAULT_STARTING_VALUE_CM, RATING_LIMIT } from '../config/constants';
import { UserModel, type UserHydratedDocument } from '../database/models/user.model';
import { mapUserDocumentToDto } from '../mappers/user.mapper';
import type { UserDto } from '../dto/user.dto';

export interface TelegramUserInfo {
  telegramId: number;
  username: string | null;
  firstName: string;
}

export async function findOrCreateUser(info: TelegramUserInfo): Promise<UserHydratedDocument> {
  const existing = await UserModel.findOne({ telegram_id: info.telegramId });
  if (existing) {
    if (existing.username !== info.username || existing.first_name !== info.firstName) {
      existing.username = info.username;
      existing.first_name = info.firstName;
      await existing.save();
    }
    return existing;
  }

  return UserModel.create({
    telegram_id: info.telegramId,
    username: info.username,
    first_name: info.firstName,
    value: DEFAULT_STARTING_VALUE_CM,
    last_measurement_at: null,
    chats: [],
  });
}

export async function getUserByTelegramId(telegramId: number): Promise<UserHydratedDocument | null> {
  return UserModel.findOne({ telegram_id: telegramId });
}

export async function getChatRating(chatId: number): Promise<UserDto[]> {
  const users = await UserModel.find({ chats: chatId })
    .sort({ value: -1 })
    .limit(RATING_LIMIT);
  return users.map(mapUserDocumentToDto);
}

export async function getGlobalRating(): Promise<UserDto[]> {
  const users = await UserModel.find().sort({ value: -1 }).limit(RATING_LIMIT);
  return users.map(mapUserDocumentToDto);
}
