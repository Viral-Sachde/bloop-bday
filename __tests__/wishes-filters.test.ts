import { applyFilters, EMPTY_FILTERS, isFiltered, NO_LIMIT } from '../src/lib/filters';
import { suggestWishes, TONES } from '../src/lib/wishes';
import { BloopEvent } from '../src/types';

const ev = (over: Partial<BloopEvent>): BloopEvent => ({
  id: over.name ?? 'x',
  name: 'Aman Gupta',
  kind: 'birthday',
  month: 10,
  day: 12,
  relation: 'friend',
  source: 'manual',
  photos: [],
  createdAt: 0,
  ...over,
});

describe('wishes', () => {
  test('every tone yields free and premium wishes that use the first name', () => {
    for (const t of TONES) {
      const w = suggestWishes(ev({}), t.id, 28);
      expect(w.some(x => !x.premium)).toBe(true);
      expect(w.some(x => x.premium)).toBe(true);
      expect(w.every(x => x.text.toLowerCase().includes('aman'))).toBe(true);
      expect(new Set(w.map(x => x.id)).size).toBe(w.length);
    }
  });
  test('relation-specific wishes come first', () => {
    const w = suggestWishes(ev({ relation: 'partner' }), 'sweet');
    expect(w[0].text).toContain('favourite person');
  });
  test('anniversary and custom events get their own wording', () => {
    expect(suggestWishes(ev({ kind: 'anniversary' }), 'sweet')[0].text).toContain('anniversary');
    expect(suggestWishes(ev({ kind: 'custom', title: 'Graduation' }), 'formal')[0].text).toContain('Graduation');
  });
  test('age is woven in when known', () => {
    expect(suggestWishes(ev({}), 'sweet', 28).some(x => x.text.includes('28th'))).toBe(true);
  });
});

describe('filters', () => {
  const now = new Date(2026, 9, 6);
  const list = [
    ev({ name: 'Aman', relation: 'friend', month: 10, day: 8 }),
    ev({ name: 'Riya', relation: 'family', month: 11, day: 20 }),
    ev({ name: 'Karan', relation: 'work', month: 6, day: 1, kind: 'anniversary' }),
  ];
  test('no filters returns everyone sorted by name', () => {
    expect(applyFilters(list, EMPTY_FILTERS, '', now).map(e => e.name)).toEqual(['Aman', 'Karan', 'Riya']);
    expect(isFiltered(EMPTY_FILTERS)).toBe(false);
  });
  test('relation, kind, window, search', () => {
    expect(applyFilters(list, { ...EMPTY_FILTERS, relations: ['family'] }, '', now).map(e => e.name)).toEqual(['Riya']);
    expect(applyFilters(list, { ...EMPTY_FILTERS, kinds: ['anniversary'] }, '', now).map(e => e.name)).toEqual(['Karan']);
    expect(applyFilters(list, { ...EMPTY_FILTERS, withinDays: 30 }, '', now).map(e => e.name)).toEqual(['Aman'])
    expect(applyFilters(list, { ...EMPTY_FILTERS, withinDays: 90 }, '', now).map(e => e.name)).toEqual(['Aman', 'Riya']);
    expect(applyFilters(list, { ...EMPTY_FILTERS, withinDays: 7 }, '', now).map(e => e.name)).toEqual(['Aman']);
    expect(applyFilters(list, EMPTY_FILTERS, 'ri', now).map(e => e.name)).toEqual(['Riya']);
    expect(isFiltered({ ...EMPTY_FILTERS, withinDays: 7 })).toBe(true);
    expect(NO_LIMIT).toBeGreaterThan(365);
  });
});
