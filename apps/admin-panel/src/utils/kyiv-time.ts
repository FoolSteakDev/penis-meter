const KYIV_TIME_ZONE = 'Europe/Kyiv';

const dateTimeFormatter = new Intl.DateTimeFormat('uk-UA', {
  timeZone: KYIV_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const dateInputFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: KYIV_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function formatKyivDateTime(value: string | null): string {
  if (!value) return '—';
  return dateTimeFormatter.format(new Date(value));
}

export function toKyivDateInputValue(value: string | null): string {
  if (!value) return '';
  return dateInputFormatter.format(new Date(value));
}
