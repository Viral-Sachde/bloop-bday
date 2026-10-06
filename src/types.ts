export type EventKind = 'birthday' | 'anniversary' | 'custom';
export type Relation = 'friend' | 'family' | 'partner' | 'work' | 'other';
export type Tone = 'sweet' | 'funny' | 'short' | 'hype' | 'formal';
export type Source = 'manual' | 'contacts' | 'file' | 'paste';

/** Reminder: fire `daysBefore` days before the event, at hour:minute (24h, local time). */
export interface ReminderRule {
  id: string;
  daysBefore: number;
  hour: number;
  minute: number;
}

export interface BloopEvent {
  id: string;
  name: string;
  kind: EventKind;
  /** Only for kind === 'custom', e.g. "Graduation". */
  title?: string;
  month: number; // 1-12
  day: number; // 1-31
  year?: number; // birth / start year, optional
  relation: Relation;
  phone?: string;
  notes?: string;
  source: Source;
  contactId?: string;
  /** Gallery URIs the user pinned to this person. */
  photos: string[];
  /** Per-person override. undefined = use the global defaults. */
  reminders?: ReminderRule[];
  createdAt: number;
}

export interface Settings {
  onboarded: boolean;
  notificationsEnabled: boolean;
  defaultRules: ReminderRule[];
  defaultTone: Tone;
  /** epoch ms until which the premium wish pack (rewarded-video unlock) stays open */
  premiumWishesUntil: number;
}
