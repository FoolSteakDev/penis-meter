import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { envConfig } from '../config/env.config';

dayjs.extend(utc);

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
