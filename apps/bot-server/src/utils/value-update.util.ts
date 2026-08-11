import type { UserMode } from '../database/models/user.model';
import { modeSign } from './mode.util';

/**
 * Pipeline-апдейт, що застосовує delta до value з клампом об інваріант режиму
 * (4.1) і синхронізує growth-поля ФАКТИЧНО застосованою величиною, а не
 * заявленою. Саме тому це pipeline, а не $inc: кламп треба порахувати
 * на сервері від поточного $value, інакше паралельний /metr + дуель дадуть
 * розʼїзд value і growth.
 *
 * extraSet - додаткові поля стадії $set (вирази, не значення-літерали:
 * у pipeline-апдейті ВСЕ має бути виразами, звичайний $inc/$addToSet тут
 * не працює - див. виклик у measurement.service.ts).
 */
export function buildClampedValueUpdate(
  delta: number,
  mode: UserMode,
  extraSet: Record<string, unknown> = {},
): Record<string, unknown>[] {
  const sign = modeSign(mode);
  const sum = { $add: ['$value', delta] };
  const clamped = sign > 0 ? { $max: [0, sum] } : { $min: [0, sum] };

  return [
    { $set: { __next: { $round: [clamped, 2] } } },
    { $set: { __applied: { $round: [{ $subtract: ['$__next', '$value'] }, 2] } } },
    {
      $set: {
        value: '$__next',
        season_growth: { $round: [{ $add: ['$season_growth', '$__applied'] }, 2] },
        round_growth: { $round: [{ $add: ['$round_growth', '$__applied'] }, 2] },
        // $max ігнорує null, тож дефолтне round_best_delta: null не заважає.
        round_best_delta: { $max: ['$round_best_delta', { $multiply: ['$__applied', sign] }] },
        ...extraSet,
      },
    },
    { $unset: ['__next', '__applied'] },
  ];
}
