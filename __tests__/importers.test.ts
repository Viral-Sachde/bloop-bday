import { nameFromSummary, parseBulk, parseCompactDate, parseICS, parseVCard } from '../src/lib/importers';

describe('parseCompactDate', () => {
  test.each([
    ['19950412', { month: 4, day: 12, year: 1995 }],
    ['1995-04-12', { month: 4, day: 12, year: 1995 }],
    ['--0412', { month: 4, day: 12, year: undefined }],
    ['--04-12', { month: 4, day: 12, year: undefined }],
    ['19950412T000000Z', { month: 4, day: 12, year: 1995 }],
    ['16040412', { month: 4, day: 12, year: undefined }], // Google's "no year"
  ])('%s', (raw, expected) => {
    expect(parseCompactDate(raw)).toEqual(expected);
  });
  test('rejects nonsense', () => {
    expect(parseCompactDate('hello')).toBeNull();
    expect(parseCompactDate('19951332')).toBeNull();
    expect(parseCompactDate('--0230')).toBeNull();
  });
});

describe('parseVCard', () => {
  const vcf = [
    'BEGIN:VCARD', 'VERSION:3.0', 'FN:Aman Gupta', 'N:Gupta;Aman;;;', 'TEL;TYPE=CELL:+91 98765 43210', 'BDAY:1998-10-12', 'END:VCARD',
    'BEGIN:VCARD', 'VERSION:3.0', 'N:Sharma;Riya;;;', 'BDAY;VALUE=date:--0703', 'END:VCARD',
    'BEGIN:VCARD', 'FN:No Birthday', 'END:VCARD',
    'BEGIN:VCARD', 'FN:Folded', 'BDAY:1990', ' 0101', 'END:VCARD',
  ].join('\r\n');

  test('reads names, dates, phones; skips contacts without a birthday', () => {
    const out = parseVCard(vcf);
    expect(out).toEqual([
      { name: 'Aman Gupta', month: 10, day: 12, year: 1998, phone: '+91 98765 43210' },
      { name: 'Riya Sharma', month: 7, day: 3, year: undefined, phone: undefined },
      { name: 'Folded', month: 1, day: 1, year: 1990, phone: undefined },
    ]);
  });
  test('empty input', () => expect(parseVCard('')).toEqual([]));
});

describe('parseICS', () => {
  const ics = [
    'BEGIN:VCALENDAR',
    'BEGIN:VEVENT', 'SUMMARY:Aman\'s birthday', 'DTSTART;VALUE=DATE:20261012', 'RRULE:FREQ=YEARLY', 'END:VEVENT',
    'BEGIN:VEVENT', 'SUMMARY:Team offsite', 'DTSTART:20261020T090000Z', 'END:VEVENT',
    'BEGIN:VEVENT', 'SUMMARY:Birthday: Riya Sharma', 'DTSTART;VALUE=DATE:20260703', 'END:VEVENT',
    'END:VCALENDAR',
  ].join('\n');

  test('keeps birthday events only', () => {
    const out = parseICS(ics);
    expect(out.map(o => [o.name, o.month, o.day])).toEqual([
      ['Aman', 10, 12],
      ['Riya Sharma', 7, 3],
    ]);
  });
  test('nameFromSummary', () => {
    expect(nameFromSummary("Aman Gupta's Birthday")).toBe('Aman Gupta');
    expect(nameFromSummary('Aman Gupta - Birthday')).toBe('Aman Gupta');
    expect(nameFromSummary('Meeting')).toBeNull();
    expect(nameFromSummary('Birthday')).toBeNull();
  });
});

describe('parseBulk', () => {
  test('mixed formats', () => {
    const out = parseBulk(
      ['Aman 12 Oct', 'Riya - 3/7', 'Neha, March 9 1998', '12 October Karan', 'Dev 2001-04-30', 'Meera 25/12', 'Sam 12/25', 'garbage line', ''].join('\n'),
    );
    expect(out.map(o => [o.name, o.month, o.day, o.year])).toEqual([
      ['Aman', 10, 12, undefined],
      ['Riya', 7, 3, undefined], // dd/mm default
      ['Neha', 3, 9, 1998],
      ['Karan', 10, 12, undefined],
      ['Dev', 4, 30, 2001],
      ['Meera', 12, 25, undefined],
      ['Sam', 12, 25, undefined], // 25 can only be a day, so month/day is inferred
    ]);
  });
  test('rejects impossible dates and nameless lines', () => {
    expect(parseBulk('Aman 31 Feb')).toEqual([]);
    expect(parseBulk('12 Oct')).toEqual([]);
  });
  test('ordinals', () => {
    expect(parseBulk('Aman 3rd Nov')[0]).toMatchObject({ name: 'Aman', month: 11, day: 3 });
  });
});
