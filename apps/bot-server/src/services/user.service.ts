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

/**
 * "Дешеве" оновлення username/first_name для ВЖЕ відомого юзера - викликається
 * з middleware в bot.ts на кожне повідомлення, щоб надійний @username-меншн у
 * дуелях не деградував до tg://user?id= через застарілі дані. Свідомо НЕ
 * створює нових користувачів (на відміну від findOrCreateUser) - інакше
 * middleware засмічувало б БД усіма, хто просто написав щось у чаті.
 */
export async function refreshKnownUserProfile(info: TelegramUserInfo): Promise<void> {
  await UserModel.updateOne(
    {
      telegram_id: info.telegramId,
      $or: [{ username: { $ne: info.username } }, { first_name: { $ne: info.firstName } }],
    },
    { $set: { username: info.username, first_name: info.firstName } },
  );
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

/** Місце користувача за season_growth/round_growth - глобально або в межах чату. */
export async function getGrowthRank(
  field: 'season_growth' | 'round_growth',
  value: number,
  chatId?: number,
): Promise<number> {
  const filter: Record<string, unknown> = { [field]: { $gt: value } };
  if (chatId !== undefined) {
    filter.chats = chatId;
  }
  const higherCount = await UserModel.countDocuments(filter);
  return higherCount + 1;
}
