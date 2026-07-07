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

export const envConfig = {
  botToken: requireEnv('BOT_TOKEN'),
  mongoUri: requireEnv('MONGO_URI'),
  port: Number(process.env.PORT ?? 3000),
  adminCorsOrigin: process.env.ADMIN_CORS_ORIGIN ?? '*',
  measurementCooldownHours: Number(
    process.env.MEASUREMENT_COOLDOWN_HOURS ?? DEFAULT_MEASUREMENT_COOLDOWN_HOURS,
  ),
};
