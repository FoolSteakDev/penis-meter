import { QuestSettingsModel, type QuestSettingsHydratedDocument } from '../database/models/quest-settings.model';
import { createTtlCache } from '../utils/ttl-cache.util';

const SETTINGS_CACHE_TTL_MS = 60 * 1000;
const SETTINGS_CACHE_KEY = 'singleton';
const settingsCache = createTtlCache<QuestSettingsHydratedDocument>(SETTINGS_CACHE_TTL_MS);

async function loadQuestSettings(): Promise<QuestSettingsHydratedDocument> {
  const existing = await QuestSettingsModel.findOne();
  if (existing) {
    return existing;
  }
  return QuestSettingsModel.create({});
}

/** Смикається на гарячому шляху (події, каталог квестів) — закешовано на 60с. */
export async function getQuestSettings(): Promise<QuestSettingsHydratedDocument> {
  return settingsCache.resolve(SETTINGS_CACHE_KEY, loadQuestSettings);
}

/** Викликати після оновлення налаштувань з адмінки, щоб зміни застосувались миттєво, а не за TTL. */
export function invalidateQuestSettingsCache(): void {
  settingsCache.invalidate(SETTINGS_CACHE_KEY);
}
