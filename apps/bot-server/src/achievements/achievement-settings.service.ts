import {
  AchievementSettingsModel,
  type AchievementSettingsHydratedDocument,
} from '../database/models/achievement-settings.model';
import { createTtlCache } from '../utils/ttl-cache.util';

const SETTINGS_CACHE_TTL_MS = 60 * 1000;
const SETTINGS_CACHE_KEY = 'singleton';
const settingsCache = createTtlCache<AchievementSettingsHydratedDocument>(SETTINGS_CACHE_TTL_MS);

async function loadAchievementSettings(): Promise<AchievementSettingsHydratedDocument> {
  const existing = await AchievementSettingsModel.findOne();
  if (existing) {
    return existing;
  }
  return AchievementSettingsModel.create({});
}

/** Смикається на кожен вимір/синхронізацію - закешовано на 60с, щоб не бити базу щоразу. */
export async function getAchievementSettings(): Promise<AchievementSettingsHydratedDocument> {
  return settingsCache.resolve(SETTINGS_CACHE_KEY, loadAchievementSettings);
}

/** Викликати після оновлення налаштувань з адмінки, щоб зміни застосувались миттєво, а не за TTL. */
export function invalidateAchievementSettingsCache(): void {
  settingsCache.invalidate(SETTINGS_CACHE_KEY);
}
