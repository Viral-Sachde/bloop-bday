import {
  DEFAULT_RULES,
  describeRule,
  fireTime,
  MAX_SCHEDULED,
  notificationCopy,
  planAll,
  planEvent,
  possessive,
} from '../src/lib/reminders';
import { BloopEvent } from '../src/types';

const ev = (over: Partial<BloopEvent> = {}): BloopEvent => ({
  id: 'e1',
  name: 'Aman',
  kind: 'birthday',
  month: 10,
  day: 12,
  relation: 'friend',
  source: 'manual',
  photos: [],
  createdAt: 0,
  ...over,
});

describe('reminders', () => {
  const now = new Date(2026, 9, 6, 10, 0); // 6 Oct 2026 10:00

  test('defaults: 11:55 PM the night before + 12:00 AM sharp', () => {
    const plan = planEvent(ev(), DEFAULT_RULES, now, 1);
    expect(plan.map(p => p.fireAt)).toEqual([new Date(2026, 9, 11, 23, 55), new Date(2026, 9, 12, 0, 0)]);
  });

  test('past firings are dropped, future ones kept', () => {
    // Today is the birthday, 00:00 has passed, 23:55 eve has passed -> nothing this year.
    const plan = planEvent(ev({ month: 10, day: 6 }), DEFAULT_RULES, now, 1);
    expect(plan).toHaveLength(0);
    // Two occurrences: next year's two firings exist.
    expect(planEvent(ev({ month: 10, day: 6 }), DEFAULT_RULES, now, 2)).toHaveLength(2);
  });

  test('schedules this and next year by default', () => {
    expect(planEvent(ev(), DEFAULT_RULES, now)).toHaveLength(4);
  });

  test('per-person override replaces defaults', () => {
    const e = ev({ reminders: [{ id: 'x', daysBefore: 3, hour: 9, minute: 30 }] });
    const plan = planEvent(e, DEFAULT_RULES, now, 1);
    expect(plan).toHaveLength(1);
    expect(plan[0].fireAt).toEqual(new Date(2026, 9, 9, 9, 30));
  });

  test('empty override means no reminders at all', () => {
    expect(planEvent(ev({ reminders: [] }), DEFAULT_RULES, now)).toHaveLength(0);
  });

  test('fireTime crosses month boundary', () => {
    expect(fireTime(new Date(2026, 10, 1), { id: 'a', daysBefore: 1, hour: 23, minute: 55 })).toEqual(
      new Date(2026, 9, 31, 23, 55),
    );
  });

  test('ids are stable and unique per event/year/rule', () => {
    const a = planEvent(ev(), DEFAULT_RULES, now).map(p => p.id);
    const b = planEvent(ev(), DEFAULT_RULES, now).map(p => p.id);
    expect(a).toEqual(b);
    expect(new Set(a).size).toBe(a.length);
  });

  test('planAll is sorted and capped', () => {
    const many = Array.from({ length: 300 }, (_, i) => ev({ id: `e${i}`, day: (i % 28) + 1, month: (i % 12) + 1 }));
    const plan = planAll(many, DEFAULT_RULES, now);
    expect(plan.length).toBe(MAX_SCHEDULED);
    for (let i = 1; i < plan.length; i++) expect(plan[i].fireAt.getTime()).toBeGreaterThanOrEqual(plan[i - 1].fireAt.getTime());
  });

  test('copy: midnight', () => {
    const c = notificationCopy(ev({ year: 1998 }), DEFAULT_RULES[1], new Date(2026, 9, 12));
    expect(c.title).toBe("It's Aman's birthday! 🎉");
    expect(c.body).toContain('12:00 AM sharp');
    expect(c.body).toContain('They turn 28');
  });

  test('copy: five minutes to midnight', () => {
    const c = notificationCopy(ev(), DEFAULT_RULES[0], new Date(2026, 9, 12));
    expect(c.body).toContain('5 minutes to midnight');
  });

  test('copy: anniversary and custom nouns', () => {
    expect(notificationCopy(ev({ kind: 'anniversary' }), DEFAULT_RULES[1], new Date()).title).toContain('anniversary');
    expect(notificationCopy(ev({ kind: 'custom', title: 'Graduation' }), DEFAULT_RULES[1], new Date()).title).toContain('Graduation');
  });

  test('possessive and describeRule', () => {
    expect(possessive('Chris')).toBe("Chris'");
    expect(possessive('Aman')).toBe("Aman's");
    expect(describeRule(DEFAULT_RULES[1])).toContain('12:00 AM sharp');
    expect(describeRule(DEFAULT_RULES[0])).toContain('night before');
    expect(describeRule({ id: 'z', daysBefore: 7, hour: 9, minute: 0 })).toBe('9:00 AM, 7 days before');
  });
});
