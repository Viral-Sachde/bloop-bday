import { BloopEvent, ReminderRule } from '../types';
import { followingOccurrence, formatClock, nextOccurrence, ordinal, turningAge } from './dates';

/**
 * Out of the box Bloop pings twice: a heads-up at 11:55 PM the night before,
 * then "12:00 AM sharp" on the dot so the wish lands first.
 */
export const DEFAULT_RULES: ReminderRule[] = [
  { id: 'eve-2355', daysBefore: 1, hour: 23, minute: 55 },
  { id: 'midnight', daysBefore: 0, hour: 0, minute: 0 },
];

export function makeRule(daysBefore: number, hour: number, minute: number): ReminderRule {
  return { id: `r-${daysBefore}-${hour}-${minute}`, daysBefore, hour, minute };
}

export function rulesFor(event: BloopEvent, defaults: ReminderRule[]): ReminderRule[] {
  return event.reminders ?? defaults;
}

export function describeRule(rule: ReminderRule): string {
  const clock = formatClock(rule.hour, rule.minute);
  if (rule.daysBefore === 0) {
    return rule.hour === 0 && rule.minute === 0
      ? '12:00 AM sharp, the moment it begins'
      : `${clock} on the day`;
  }
  if (rule.daysBefore === 1) {
    return rule.hour >= 18 ? `${clock}, the night before` : `${clock}, one day before`;
  }
  return `${clock}, ${rule.daysBefore} days before`;
}

export function shortRule(rule: ReminderRule): string {
  const clock = formatClock(rule.hour, rule.minute);
  if (rule.daysBefore === 0) return `${clock} · on the day`;
  if (rule.daysBefore === 1) return `${clock} · day before`;
  return `${clock} · ${rule.daysBefore}d before`;
}

export function fireTime(occurrence: Date, rule: ReminderRule): Date {
  return new Date(
    occurrence.getFullYear(),
    occurrence.getMonth(),
    occurrence.getDate() - rule.daysBefore,
    rule.hour,
    rule.minute,
    0,
    0,
  );
}

export interface PlannedReminder {
  /** Stable id: re-scheduling the same plan overwrites instead of duplicating. */
  id: string;
  eventId: string;
  fireAt: Date;
  occurrence: Date;
  rule: ReminderRule;
}

/**
 * Every future firing for one event across its next `occurrences` yearly
 * occurrences. Android has no yearly repeat, so we schedule a couple of years
 * ahead and top up whenever the app (or the delivery handler) runs.
 */
export function planEvent(
  event: BloopEvent,
  defaults: ReminderRule[],
  now: Date = new Date(),
  occurrences = 2,
): PlannedReminder[] {
  const out: PlannedReminder[] = [];
  let occ = nextOccurrence(event.month, event.day, now);
  for (let i = 0; i < occurrences; i++) {
    for (const rule of rulesFor(event, defaults)) {
      const fireAt = fireTime(occ, rule);
      if (fireAt.getTime() > now.getTime()) {
        out.push({
          id: `${event.id}|${occ.getFullYear()}|${rule.id}`,
          eventId: event.id,
          fireAt,
          occurrence: occ,
          rule,
        });
      }
    }
    occ = followingOccurrence(event.month, event.day, occ);
  }
  return out.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());
}

/** Android caps pending alarms (~500 per app); stay well below it. */
export const MAX_SCHEDULED = 400;

export function planAll(
  events: BloopEvent[],
  defaults: ReminderRule[],
  now: Date = new Date(),
): PlannedReminder[] {
  const all = events.flatMap(e => planEvent(e, defaults, now));
  return all.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime()).slice(0, MAX_SCHEDULED);
}

export function eventNoun(event: BloopEvent): string {
  if (event.kind === 'birthday') return 'birthday';
  if (event.kind === 'anniversary') return 'anniversary';
  return event.title?.trim() || 'day';
}

export function possessive(name: string): string {
  return /s$/i.test(name) ? `${name}'` : `${name}'s`;
}

export function notificationCopy(
  event: BloopEvent,
  rule: ReminderRule,
  occurrence: Date,
): { title: string; body: string } {
  const who = event.name;
  const noun = eventNoun(event);
  const age = event.kind === 'birthday' ? turningAge(event.year, occurrence) : undefined;
  const turning = age ? ` They turn ${age}.` : '';
  const clock = formatClock(rule.hour, rule.minute);

  if (rule.daysBefore === 0 && rule.hour === 0 && rule.minute === 0) {
    return {
      title: `It's ${possessive(who)} ${noun}! 🎉`,
      body: `12:00 AM sharp. Be the first to wish.${turning}`,
    };
  }
  if (rule.daysBefore === 0) {
    return {
      title: `${possessive(who)} ${noun} is today`,
      body: `Your ${clock} bloop.${turning} Tap to pick a wish.`,
    };
  }
  if (rule.daysBefore === 1 && rule.hour >= 18) {
    const minutesLeft = (24 - rule.hour) * 60 - rule.minute;
    const lead = minutesLeft <= 60 ? `${minutesLeft} minutes to midnight.` : 'Tomorrow is the day.';
    return {
      title: `${possessive(who)} ${noun} starts soon`,
      body: `${lead} Get your wish ready.${turning}`,
    };
  }
  return {
    title: `${possessive(who)} ${noun} is in ${rule.daysBefore} ${rule.daysBefore === 1 ? 'day' : 'days'}`,
    body: `${ordinalOrEmpty(age)}Plan something or line up a message.`,
  };
}

function ordinalOrEmpty(age: number | undefined): string {
  return age ? `Turning ${ordinal(age)}. ` : '';
}
