const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export function formatRelativeDaysAgo(
  value: string | Date,
  now: Date | number = new Date(),
): string {
  const days = Math.max(
    0,
    Math.round((getTime(now) - getTime(value)) / DAY_MS),
  );

  if (days === 0) return 'היום';
  if (days === 1) return 'לפני יום';
  if (days === 2) return 'לפני יומיים';

  return `לפני ${days} ימים`;
}

export function formatRelativeHoursAgo(
  value: string | Date,
  now: Date | number = new Date(),
): string {
  const hours = Math.max(
    0,
    Math.round((getTime(now) - getTime(value)) / HOUR_MS),
  );

  if (hours === 0) return 'בשעה האחרונה';
  if (hours === 1) return 'לפני שעה';
  if (hours === 2) return 'לפני שעתיים';

  return `לפני ${hours} שעות`;
}

function getTime(value: string | Date | number): number {
  return typeof value === 'number' ? value : new Date(value).getTime();
}
