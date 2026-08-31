import mongoose from 'mongoose';
import { connectMongo } from './mongo.connection';

/**
 * Одноразове прибирання колекції `quests` після демонтажу Quest-сутності
 * (замінена системою досягнень). Запускати ВРУЧНУ після релізу, не на старті
 * бота - колекція вже ніким не читається й не пишеться, дропнути її можна
 * коли завгодно.
 */
export async function dropQuestsCollection(): Promise<void> {
  try {
    await mongoose.connection.collection('quests').drop();
    console.log('[drop-quests] колекцію quests видалено');
  } catch (error) {
    if ((error as { codeName?: string }).codeName === 'NamespaceNotFound') {
      console.log('[drop-quests] колекції quests вже немає - нічого робити');
      return;
    }
    throw error;
  }
}

async function main(): Promise<void> {
  await connectMongo();
  await dropQuestsCollection();
  process.exit(0);
}

if (require.main === module) {
  main().catch((error) => {
    console.error('[drop-quests] failed', error);
    process.exit(1);
  });
}
