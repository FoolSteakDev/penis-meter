import dayjs from 'dayjs';
import { isWeekendUtc, nowUtc } from './date.util';

export interface WorkSchedule {
  schedule: number[];
  lastWeekend: Date | null;
}

/**
 * Найближча (включно з сьогодні) субота в UTC - точка відліку за замовчуванням
 * для стандартного графіка [5, 2], щоб поведінка збігалась зі старою
 * календарною логікою вихідних, поки адмін не задасть інший графік вручну.
 */
export function getDefaultLastWeekendAnchor(): Date {
  const today = nowUtc();
  const daysSinceSaturday = (today.day() + 1) % 7;
  return today.subtract(daysSinceSaturday, 'day').startOf('day').toDate();
}

/**
 * Чи є сьогодні вихідним днем для конкретного користувача, згідно з його
 * особистим графіком `[робочі, вихідні]` і точкою відліку `lastWeekend`
 * (початок одного з вихідних періодів - будь-якого, бо цикл нескінченно
 * повторюється в обидва боки). Немає потреби оновлювати `lastWeekend`
 * згодом - це лише опорна точка для модульної арифметики.
 *
 * Якщо графік не заданий/некоректний - фолбек на календарні вихідні
 * (субота/неділя), щоб не ламати поведінку для ще не мігрованих юзерів.
 */
export function isRestDayForUser(work: WorkSchedule | null | undefined): boolean {
  if (!work || !work.lastWeekend || !Array.isArray(work.schedule) || work.schedule.length !== 2) {
    return isWeekendUtc();
  }

  const [workDays, restDays] = work.schedule;
  const cycleLength = workDays + restDays;
  if (!(cycleLength > 0) || !(restDays > 0)) {
    return isWeekendUtc();
  }

  const daysSinceAnchor = nowUtc().startOf('day').diff(dayjs.utc(work.lastWeekend).startOf('day'), 'day');
  const position = ((daysSinceAnchor % cycleLength) + cycleLength) % cycleLength;
  return position < restDays;
}
