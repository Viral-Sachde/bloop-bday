import {
  countdownLabel,
  daysInMonth,
  daysUntil,
  formatClock,
  isValidDate,
  nextOccurrence,
  ordinal,
  turningAge,
  zodiac,
} from '../src/lib/dates';

const d = (y: number, m: number, day: number, h = 0, min = 0) => new Date(y, m - 1, day, h, min);

describe('dates', () => {
  test('next occurrence is today when the date is today', () => {
    expect(nextOccurrence(10, 6, d(2026, 10, 6, 15, 30))).toEqual(d(2026, 10, 6));
  });

  test('rolls to next year once passed', () => {
    expect(nextOccurrence(10, 5, d(2026, 10, 6))).toEqual(d(2027, 10, 5));
  });

  test('Feb 29 falls on Feb 28 in non-leap years and Feb 29 in leap years', () => {
    expect(nextOccurrence(2, 29, d(2026, 3, 1))).toEqual(d(2027, 2, 28));
    expect(nextOccurrence(2, 29, d(2027, 3, 1))).toEqual(d(2028, 2, 29));
  });

  test('daysUntil counts whole days, including across year end', () => {
    expect(daysUntil(10, 6, d(2026, 10, 6, 23, 59))).toBe(0);
    expect(daysUntil(10, 7, d(2026, 10, 6, 23, 59))).toBe(1);
    expect(daysUntil(1, 1, d(2026, 12, 31))).toBe(1);
    expect(daysUntil(10, 5, d(2026, 10, 6))).toBe(364);
  });

  test('turningAge', () => {
    expect(turningAge(1998, d(2026, 10, 12))).toBe(28);
    expect(turningAge(undefined, d(2026, 10, 12))).toBeUndefined();
  });

  test('ordinal handles teens', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 101, 111].map(ordinal)).toEqual([
      '1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '101st', '111th',
    ]);
  });

  test('isValidDate / daysInMonth', () => {
    expect(isValidDate(2, 30)).toBe(false);
    expect(isValidDate(2, 29)).toBe(true);
    expect(isValidDate(2, 29, 2027)).toBe(false);
    expect(isValidDate(2, 29, 2028)).toBe(true);
    expect(isValidDate(13, 1)).toBe(false);
    expect(isValidDate(4, 31)).toBe(false);
    expect(daysInMonth(4)).toBe(30);
    expect(daysInMonth(12)).toBe(31);
  });

  test('formatClock', () => {
    expect(formatClock(0, 0)).toBe('12:00 AM');
    expect(formatClock(23, 55)).toBe('11:55 PM');
    expect(formatClock(12, 5)).toBe('12:05 PM');
    expect(formatClock(9, 0)).toBe('9:00 AM');
  });

  test('countdownLabel', () => {
    expect(countdownLabel(0)).toBe('Today');
    expect(countdownLabel(1)).toBe('Tomorrow');
    expect(countdownLabel(5)).toBe('5 days');
    expect(countdownLabel(10)).toBe('1 week');
    expect(countdownLabel(30)).toBe('4 weeks');
    expect(countdownLabel(200)).toBe('7 months');
  });

  test('zodiac boundaries', () => {
    expect(zodiac(1, 1)).toBe('Capricorn');
    expect(zodiac(1, 20)).toBe('Aquarius');
    expect(zodiac(3, 20)).toBe('Pisces');
    expect(zodiac(3, 21)).toBe('Aries');
    expect(zodiac(10, 6)).toBe('Libra');
    expect(zodiac(12, 21)).toBe('Sagittarius');
    expect(zodiac(12, 22)).toBe('Capricorn');
  });
});
