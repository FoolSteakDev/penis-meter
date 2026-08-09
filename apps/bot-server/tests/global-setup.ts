import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod: MongoMemoryServer | undefined;

/**
 * globalSetup виконується один раз до всіх тестових файлів і встановлює
 * MONGO_URI/BOT_TOKEN у process.env ДО того, як тестові файли встигнуть
 * імпортувати щось із src/ (а разом з тим - config/env.config.ts). Без
 * цього dotenv.config() підхопить справжній .env із прод-Atlas URI (див.
 * README/пам'ять проєкту - вже була помилка з "smoke test б'є в прод").
 */
export async function setup(): Promise<void> {
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();
  process.env.BOT_TOKEN = 'test-bot-token';
}

export async function teardown(): Promise<void> {
  await mongod?.stop();
}
