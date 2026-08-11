import type { PipelineStage } from 'mongoose';
import { DEFAULT_STARTING_VALUE_CM, RATING_LIMIT } from '../config/constants';
import { UserModel, type UserDocument, type UserHydratedDocument, type UserMode } from '../database/models/user.model';
import { mapUserDocumentToDto } from '../mappers/user.mapper';
import { progress } from '../utils/mode.util';
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

/** Сортування за |value|: буровик на -500 стоїть поруч із гравцем на +500.
 *  Рішення власника - режим це стиль гри, а не окрема ліга. */
const ABS_RATING_PIPELINE: PipelineStage[] = [
  { $addFields: { abs_value: { $abs: '$value' } } },
  { $sort: { abs_value: -1, _id: 1 } }, // _id як tie-breaker: без нього порядок нестабільний між викликами
  { $limit: RATING_LIMIT },
];

export async function getChatRating(chatId: number): Promise<UserDto[]> {
  const users = await UserModel.aggregate<UserDocument>([
    { $match: { chats: chatId } } as PipelineStage,
    ...ABS_RATING_PIPELINE,
  ]);
  return users.map(mapUserDocumentToDto);
}

export async function getGlobalRating(): Promise<UserDto[]> {
  const users = await UserModel.aggregate<UserDocument>(ABS_RATING_PIPELINE);
  return users.map(mapUserDocumentToDto);
}

/** Місце користувача за прогресом у бік ВЛАСНОЇ мети (season_growth/round_growth) - глобально або в межах чату. */
export async function getGrowthRank(
  field: 'season_growth' | 'round_growth',
  value: number,
  mode: UserMode,
  chatId?: number,
): Promise<number> {
  const modeSignExpr = { $cond: [{ $eq: ['$mode', 'drill'] }, -1, 1] };
  const filter: Record<string, unknown> = {
    $expr: { $gt: [{ $multiply: [`$${field}`, modeSignExpr] }, progress(value, mode)] },
  };
  if (chatId !== undefined) {
    filter.chats = chatId;
  }
  const higherCount = await UserModel.countDocuments(filter);
  return higherCount + 1;
}
