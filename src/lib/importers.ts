import { isValidDate, MONTHS } from './dates';

export interface ParsedPerson {
  name: string;
  month: number;
  day: number;
  year?: number;
  phone?: string;
}

/** Unfold RFC 5545/6350 continuation lines (a line starting with space/tab continues the previous). */
function unfold(text: string): string[] {
  return text.replace(/\r\n?/g, '\n').replace(/\n[ \t]/g, '').split('\n');
}

/**
 * Parse the date formats vCard BDAY and iCalendar DTSTART use:
 *   19950412, 1995-04-12, --0412, --04-12, 19950412T000000Z
 */
export function parseCompactDate(raw: string): { month: number; day: number; year?: number } | null {
  const v = raw.trim();
  let m = /^--(\d{2})-?(\d{2})$/.exec(v);
  if (m) return build(+m[1], +m[2]);
  m = /^(\d{4})-?(\d{2})-?(\d{2})(?:T.*)?$/.exec(v);
  if (m) {
    const year = +m[1];
    // Some exporters write 1604 (Google) or 0000/0001 as "no year".
    return build(+m[2], +m[3], year >= 1900 ? year : undefined);
  }
  return null;
}

function build(month: number, day: number, year?: number) {
  return isValidDate(month, day, year) ? { month, day, year } : null;
}

export function parseVCard(text: string): ParsedPerson[] {
  const out: ParsedPerson[] = [];
  let cur: { name?: string; n?: string; bday?: string; phone?: string } | null = null;
  for (const line of unfold(text)) {
    const upper = line.toUpperCase();
    if (upper.startsWith('BEGIN:VCARD')) cur = {};
    else if (upper.startsWith('END:VCARD')) {
      if (cur) {
        const name = (cur.name || cur.n || '').trim();
        const date = cur.bday ? parseCompactDate(cur.bday) : null;
        if (name && date) out.push({ name, ...date, phone: cur.phone });
      }
      cur = null;
    } else if (cur) {
      const idx = line.indexOf(':');
      if (idx < 0) continue;
      const key = line.slice(0, idx).split(';')[0].toUpperCase();
      const value = line.slice(idx + 1);
      if (key === 'FN') cur.name = unescapeText(value);
      else if (key === 'N') {
        const [family = '', given = ''] = value.split(';');
        cur.n = `${given} ${family}`.trim();
      } else if (key === 'BDAY') cur.bday = value;
      else if (key === 'TEL' && !cur.phone) cur.phone = value.trim();
    }
  }
  return out;
}

function unescapeText(v: string): string {
  return v.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim();
}

/** Pull "Name" out of summaries like "Aman's birthday", "Birthday: Aman", "Aman Gupta - Birthday". */
export function nameFromSummary(summary: string): string | null {
  const s = unescapeText(summary);
  if (!/birthday|bday|b'day/i.test(s)) return null;
  const cleaned = s
    .replace(/[’']s\s+(birthday|bday|b'day)/i, '')
    .replace(/\b(birthday|bday|b'day)\b\s*[:\-–]?/i, '')
    .replace(/[🎂🎉🎈🥳]/gu, '')
    .replace(/[:\-–]\s*$/, '')
    .trim();
  return cleaned.length > 0 ? cleaned : null;
}

/** iCalendar files (Google Calendar "Birthdays", Facebook/Outlook exports). */
export function parseICS(text: string): ParsedPerson[] {
  const out: ParsedPerson[] = [];
  let cur: { summary?: string; start?: string } | null = null;
  for (const line of unfold(text)) {
    const upper = line.toUpperCase();
    if (upper.startsWith('BEGIN:VEVENT')) cur = {};
    else if (upper.startsWith('END:VEVENT')) {
      if (cur?.summary && cur.start) {
        const name = nameFromSummary(cur.summary);
        const date = parseCompactDate(cur.start);
        if (name && date) out.push({ name, ...date });
      }
      cur = null;
    } else if (cur) {
      const idx = line.indexOf(':');
      if (idx < 0) continue;
      const key = line.slice(0, idx).split(';')[0].toUpperCase();
      const value = line.slice(idx + 1);
      if (key === 'SUMMARY') cur.summary = value;
      else if (key === 'DTSTART') cur.start = value;
    }
  }
  return out;
}

const MONTH_LOOKUP: Record<string, number> = {};
MONTHS.forEach((m, i) => {
  MONTH_LOOKUP[m.toLowerCase()] = i + 1;
  MONTH_LOOKUP[m.slice(0, 3).toLowerCase()] = i + 1;
});
MONTH_LOOKUP.sept = 9;

/**
 * Quick-add text. One person per line:
 *   Aman 12 Oct          Riya - 3/7           Neha, March 9 1998
 *   12 October Karan     Dev 2001-04-30
 * Numeric dates are day/month unless the numbers only make sense as month/day.
 */
export function parseBulk(text: string): ParsedPerson[] {
  const out: ParsedPerson[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const parsed = parseBulkLine(line);
    if (parsed) out.push(parsed);
  }
  return out;
}

const NAME_JUNK = /^[\s,:\-–—|@]+|[\s,:\-–—|@]+$/g;

function parseBulkLine(line: string): ParsedPerson | null {
  const monthNames = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
  let m: RegExpExecArray | null;

  // ISO 2001-04-30
  m = /(\d{4})-(\d{1,2})-(\d{1,2})/.exec(line);
  if (m && isValidDate(+m[2], +m[3], +m[1])) return done(line, m[0], +m[2], +m[3], +m[1]);

  // 12 Oct [1998]
  m = new RegExp(`(\\d{1,2})(?:st|nd|rd|th)?\\s+${monthNames}\\b(?:[\\s,]+(\\d{4}))?`, 'i').exec(line);
  if (m) {
    const month = MONTH_LOOKUP[m[2].toLowerCase()];
    const year = m[3] ? +m[3] : undefined;
    if (month && isValidDate(month, +m[1], year)) return done(line, m[0], month, +m[1], year);
  }

  // Oct 12 [1998]
  m = new RegExp(`\\b${monthNames}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?:[\\s,]+(\\d{4}))?`, 'i').exec(line);
  if (m) {
    const month = MONTH_LOOKUP[m[1].toLowerCase()];
    const year = m[3] ? +m[3] : undefined;
    if (month && isValidDate(month, +m[2], year)) return done(line, m[0], month, +m[2], year);
  }

  // 12/10, 12-10-1998, 12.10
  m = /(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{4}))?/.exec(line);
  if (m) {
    const a = +m[1];
    const b = +m[2];
    const year = m[3] ? +m[3] : undefined;
    // dd/mm by default; swap only if that is the sole valid reading.
    let day = a;
    let month = b;
    if (!isValidDate(month, day, year) || (b > 12 && a <= 12)) {
      day = b;
      month = a;
    }
    if (isValidDate(month, day, year)) return done(line, m[0], month, day, year);
  }
  return null;
}

function done(line: string, matched: string, month: number, day: number, year?: number): ParsedPerson | null {
  const name = line.replace(matched, ' ').replace(/\s{2,}/g, ' ').replace(NAME_JUNK, '').trim();
  return name ? { name, month, day, year } : null;
}

/** Same person if same normalised name and same day. */
export function dedupeKey(name: string, month: number, day: number): string {
  return `${name.toLowerCase().replace(/\s+/g, ' ').trim()}|${month}|${day}`;
}
