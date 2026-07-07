import dotenv from 'dotenv';
import { DEFAULT_MEASUREMENT_COOLDOWN_HOURS } from './constants';

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// ADMIN_CORS_ORIGIN може містити кілька origin'ів через кому (напр. локальний
// dev-хост + продакшн-домен адмінки на Render) - парсимо в масив, бо `cors`
// пакет очікує або один рядок, або масив, а не "склеєний" через кому рядок.
const adminCorsOrigins = (process.env.ADMIN_CORS_ORIGIN ?? '*')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const envConfig = {
  botToken: requireEnv('BOT_TOKEN'),
  mongoUri: requireEnv('MONGO_URI'),
  port: Number(process.env.PORT ?? 3000),
  adminCorsOrigins,
  measurementCooldownHours: Number(
    process.env.MEASUREMENT_COOLDOWN_HOURS ?? DEFAULT_MEASUREMENT_COOLDOWN_HOURS,
  ),
};
