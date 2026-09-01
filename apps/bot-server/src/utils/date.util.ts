import dayjs, { type Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { envConfig } from '../config/env.config';

dayjs.extend(utc);
dayjs.extend(timezone);

export function nowUtc() {
  return dayjs.utc();
}

export function isCooldownElapsed(lastMeasurementAt: Date | null): boolean {
  if (!lastMeasurementAt) {
    return true;
  }
  return (
    nowUtc().diff(dayjs.utc(lastMeasurementAt), 'hour', true) >= envConfig.measurementCooldownHours
  );
}

export function isWeekendUtc(): boolean {
  const day = nowUtc().day();
  return day === 0 || day === 6;
}

/** Залишок часу до `until` у форматі ГГ:ХХ, ніколи не йде в мінус. */
export function formatRemaining(until: Date): string {
  const diffMinutes = Math.max(0, dayjs.utc(until).diff(nowUtc(), 'minute'));
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function formatRemainingCooldown(lastMeasurementAt: Date | null): string {
  if (!lastMeasurementAt) {
    return '00:00';
  }
  const nextAvailableAt = dayjs.utc(lastMeasurementAt).add(envConfig.measurementCooldownHours, 'hour');
  return formatRemaining(nextAvailableAt.toDate());
}

// Дублюємо тут, а не імпортуємо apps/admin-panel/src/utils/kyiv-time.ts -
// bot-server і admin-panel не діляться кодом крізь межу workspace.
const kyivTimeFormatter = new Intl.DateTimeFormat('uk-UA', {
  timeZone: 'Europe/Kyiv',
  hour: '2-digit',
  minute: '2-digit',
});

/** HH:MM за києвським часом - для «Відповісти можна до {HH:MM}» у виклику на дуель. */
export function formatKyivTime(date: Date): string {
  return kyivTimeFormatter.format(date);
}

const kyivDateTimeFormatter = new Intl.DateTimeFormat('uk-UA', {
  timeZone: 'Europe/Kyiv',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

/** ДД.MM ГГ:ХХ за києвським часом - для дедлайну квесту («до 03.09 14:20»). */
export function formatKyivDateTime(date: Date): string {
  return kyivDateTimeFormatter.format(date).replace(',', '');
}

/** Година доби за київським часом (0..23) — для «нічних» досягнень. */
export function kyivHour(at: Dayjs = nowUtc()): number {
  return Number(at.tz('Europe/Kyiv').format('H'));
}

/** Календарний день за київським часом ('YYYY-MM-DD') — для distinct-правил квестів. */
export function kyivDay(at: Dayjs = nowUtc()): string {
  return at.tz('Europe/Kyiv').format('YYYY-MM-DD');
}
