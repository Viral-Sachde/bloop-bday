import { BloopEvent, EventKind, Relation } from '../types';
import { daysUntil } from './dates';

export interface Filters {
  relations: Relation[];
  kinds: EventKind[];
  /** Only events within this many days. 366 = no limit. */
  withinDays: number;
}

export const NO_LIMIT = 366;
export const EMPTY_FILTERS: Filters = { relations: [], kinds: [], withinDays: NO_LIMIT };

export const RELATIONS: Array<{ id: Relation; label: string; emoji: string }> = [
  { id: 'friend', label: 'Friends', emoji: '🧑‍🤝‍🧑' },
  { id: 'family', label: 'Family', emoji: '🏡' },
  { id: 'partner', label: 'Partner', emoji: '💞' },
  { id: 'work', label: 'Work', emoji: '💼' },
  { id: 'other', label: 'Other', emoji: '✨' },
];

export const KINDS: Array<{ id: EventKind; label: string; emoji: string }> = [
  { id: 'birthday', label: 'Birthdays', emoji: '🎂' },
  { id: 'anniversary', label: 'Anniversaries', emoji: '💐' },
  { id: 'custom', label: 'Other days', emoji: '🎈' },
];

export function isFiltered(f: Filters): boolean {
  return f.relations.length > 0 || f.kinds.length > 0 || f.withinDays !== NO_LIMIT;
}

export function applyFilters(events: BloopEvent[], f: Filters, query: string, now: Date): BloopEvent[] {
  const q = query.trim().toLowerCase();
  return events
    .filter(e => (f.relations.length ? f.relations.includes(e.relation) : true))
    .filter(e => (f.kinds.length ? f.kinds.includes(e.kind) : true))
    .filter(e => (f.withinDays === NO_LIMIT ? true : daysUntil(e.month, e.day, now) <= f.withinDays))
    .filter(e => (q ? e.name.toLowerCase().includes(q) || (e.title ?? '').toLowerCase().includes(q) : true))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter(x => x !== v) : [...list, v];
}
