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

export function formatRemainingCooldown(lastMeasurementAt: Date | null): string {
  if (!lastMeasurementAt) {
    return '00:00';
  }
  const nextAvailableAt = dayjs.utc(lastMeasurementAt).add(envConfig.measurementCooldownHours, 'hour');
  const diffMinutes = Math.max(0, nextAvailableAt.diff(nowUtc(), 'minute'));
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
