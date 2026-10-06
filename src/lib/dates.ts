const MS_DAY = 86_400_000;

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
export const MONTHS_SHORT = MONTHS.map(m => m.slice(0, 3));

export function isLeap(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(month: number, year?: number): number {
  if (month === 2) return year === undefined ? 29 : isLeap(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

export function isValidDate(month: number, day: number, year?: number): boolean {
  if (!Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (month < 1 || month > 12 || day < 1) return false;
  if (day > daysInMonth(month, year)) return false;
  if (year !== undefined && (year < 1900 || year > 2200)) return false;
  return true;
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Feb 29 is celebrated on Feb 28 in non-leap years. */
function occurrenceInYear(month: number, day: number, year: number): Date {
  const d = month === 2 && day === 29 && !isLeap(year) ? 28 : day;
  return new Date(year, month - 1, d);
}

/** Next local-midnight occurrence of month/day, today included. */
export function nextOccurrence(month: number, day: number, now: Date = new Date()): Date {
  const today = startOfDay(now);
  const thisYear = occurrenceInYear(month, day, today.getFullYear());
  return thisYear.getTime() >= today.getTime()
    ? thisYear
    : occurrenceInYear(month, day, today.getFullYear() + 1);
}

/** The occurrence one year after `occ`. */
export function followingOccurrence(month: number, day: number, occ: Date): Date {
  return occurrenceInYear(month, day, occ.getFullYear() + 1);
}

export function daysUntil(month: number, day: number, now: Date = new Date()): number {
  const occ = nextOccurrence(month, day, now);
  // Round: DST shifts make the raw difference 23h or 25h.
  return Math.round((occ.getTime() - startOfDay(now).getTime()) / MS_DAY);
}

/** Age they turn on `occ` (undefined when the birth year is unknown). */
export function turningAge(year: number | undefined, occ: Date): number | undefined {
  if (year === undefined) return undefined;
  const age = occ.getFullYear() - year;
  return age > 0 ? age : undefined;
}

export function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

export function formatMonthDay(month: number, day: number): string {
  return `${MONTHS_SHORT[month - 1]} ${day}`;
}

export function formatFullDate(month: number, day: number, year?: number): string {
  return `${day} ${MONTHS[month - 1]}${year ? ` ${year}` : ''}`;
}

export function countdownLabel(days: number): string {
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 7) return `${days} days`;
  if (days < 14) return '1 week';
  if (days < 60) return `${Math.round(days / 7)} weeks`;
  return `${Math.round(days / 30)} months`;
}

export function exactCountdown(days: number): string {
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `in ${days} days`;
}

export function formatClock(hour: number, minute: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
}

// [sign, month it starts, day it starts]
const ZODIAC: Array<[string, number, number]> = [
  ['Capricorn', 12, 22], ['Aquarius', 1, 20], ['Pisces', 2, 19], ['Aries', 3, 21],
  ['Taurus', 4, 20], ['Gemini', 5, 21], ['Cancer', 6, 21], ['Leo', 7, 23],
  ['Virgo', 8, 23], ['Libra', 9, 23], ['Scorpio', 10, 23], ['Sagittarius', 11, 22],
];

export function zodiac(month: number, day: number): string {
  const v = month * 100 + day;
  let current = ZODIAC[0][0];
  for (const [name, m, d] of ZODIAC) {
    if (m === 12) continue;
    if (v >= m * 100 + d) current = name;
  }
  return v >= 1222 ? 'Capricorn' : current;
}
