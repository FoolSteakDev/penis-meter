import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

const SYNODIC_MONTH_DAYS = 29.530588853;
const KNOWN_NEW_MOON_UTC = dayjs.utc('2000-01-06T18:14:00Z');

export interface MoonPhase {
  /** 0 = молодик, 0.5 = повний місяць, наближається до 1 = знову молодик */
  phase: number;
  /** 0 (молодик) .. 1 (повний місяць), симетрично спадає назад до 0 */
  fullness: number;
  name: string;
}

const PHASE_NAMES = [
  { max: 0.03, name: 'Молодик' },
  { max: 0.22, name: 'Зростаючий серп' },
  { max: 0.28, name: 'Перша чверть' },
  { max: 0.47, name: 'Зростаючий місяць' },
  { max: 0.53, name: 'Повний місяць' },
  { max: 0.72, name: 'Спадаючий місяць' },
  { max: 0.78, name: 'Остання чверть' },
  { max: 0.97, name: 'Спадаючий серп' },
  { max: 1.01, name: 'Молодик' },
];

function getPhaseName(phase: number): string {
  return (PHASE_NAMES.find((p) => phase <= p.max) ?? PHASE_NAMES[PHASE_NAMES.length - 1]).name;
}

export function getCurrentMoonPhase(): MoonPhase {
  const daysSinceEpoch = dayjs.utc().diff(KNOWN_NEW_MOON_UTC, 'day', true);
  const phase = (((daysSinceEpoch % SYNODIC_MONTH_DAYS) + SYNODIC_MONTH_DAYS) % SYNODIC_MONTH_DAYS) / SYNODIC_MONTH_DAYS;
  const fullness = 1 - Math.abs(phase - 0.5) * 2;

  return { phase, fullness, name: getPhaseName(phase) };
}
