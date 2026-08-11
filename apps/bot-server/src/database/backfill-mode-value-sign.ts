import { connectMongo } from './mongo.connection';
import { UserModel } from './models/user.model';
import type { UserMode } from './models/user.model';
import { userLabel } from '../utils/user-label.util';

export interface ModeSignBackfillRow {
  telegramId: number;
  label: string;
  mode: UserMode;
  value: number;
}

export interface ModeSignBackfillResult {
  rows: ModeSignBackfillRow[];
  applied: boolean;
}

/**
 * Одноразовий бекфіл: до появи інваріанту режиму (4.1) гравці могли
 * накопичити value з "чужим" знаком (drill+додатне чи grow+від'ємне).
 * Growth-поля НЕ чіпаємо - на відміну від свідомого перемикання (4.3.3),
 * це не вибір гравця, а виправлення стану, що виник ДО інваріанту, і карати
 * за нього приростом нечесно. Ідемпотентний - другий прогін не знаходить
 * нічого, бо value вже 0 в обох випадках задовольняє інваріант.
 */
export async function backfillModeValueSign({ apply }: { apply: boolean }): Promise<ModeSignBackfillResult> {
  const mismatched = await UserModel.find({
    $or: [
      { mode: 'grow', value: { $lt: 0 } },
      { mode: 'drill', value: { $gt: 0 } },
    ],
  });

  const rows: ModeSignBackfillRow[] = mismatched.map((u) => ({
    telegramId: u.telegram_id,
    label: userLabel(u),
    mode: u.mode,
    value: u.value,
  }));

  if (apply) {
    for (const user of mismatched) {
      // CAS: не чіпаємо, якщо гравець устиг змінити value/mode між читанням списку і записом.
      await UserModel.updateOne({ _id: user._id, mode: user.mode, value: user.value }, { $set: { value: 0 } });
    }
  }

  return { rows, applied: apply };
}

async function main(): Promise<void> {
  await connectMongo();

  const apply = process.argv.includes('--apply');
  const { rows } = await backfillModeValueSign({ apply });

  console.log('telegram_id | label            | mode  | value');
  for (const row of rows) {
    console.log(`${String(row.telegramId).padEnd(11)} | ${row.label.padEnd(16)} | ${row.mode.padEnd(5)} | ${row.value}`);
  }

  if (apply) {
    console.log(`\n[backfill-mode-value-sign] обнулено ${rows.length} гравців`);
  } else {
    console.log(`\n[backfill-mode-value-sign] буде обнулено ${rows.length} гравців (dry-run, запусти з --apply, щоб записати)`);
  }

  process.exit(0);
}

if (require.main === module) {
  main().catch((error) => {
    console.error('[backfill-mode-value-sign] failed', error);
    process.exit(1);
  });
}
