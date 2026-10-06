import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { dedupeKey } from './lib/importers';
import { DEFAULT_RULES } from './lib/reminders';
import { BloopEvent, ReminderRule, Settings } from './types';

export const STORAGE_KEY = 'bloop:v1';

export const DEFAULT_SETTINGS: Settings = {
  onboarded: false,
  notificationsEnabled: true,
  defaultRules: DEFAULT_RULES,
  defaultTone: 'sweet',
  premiumWishesUntil: 0,
};

interface Persisted {
  events: BloopEvent[];
  settings: Settings;
}

interface State extends Persisted {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addEvent: (e: Omit<BloopEvent, 'id' | 'createdAt' | 'photos'> & { photos?: string[] }) => BloopEvent;
  /** Adds many, skipping ones already present. Returns how many were new. */
  addMany: (list: Array<Omit<BloopEvent, 'id' | 'createdAt' | 'photos'>>) => number;
  updateEvent: (id: string, patch: Partial<BloopEvent>) => void;
  removeEvent: (id: string) => void;
  addPhotos: (id: string, uris: string[]) => void;
  removePhoto: (id: string, uri: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  setDefaultRules: (rules: ReminderRule[]) => void;
  resetAll: () => void;
}

let counter = 0;
export function newId(): string {
  counter += 1;
  return `${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export async function loadPersisted(): Promise<Persisted> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { events: [], settings: DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    return {
      events: Array.isArray(parsed.events) ? parsed.events : [],
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
    };
  } catch {
    return { events: [], settings: DEFAULT_SETTINGS };
  }
}

export const useStore = create<State>((set, get) => {
  const commit = (patch: Partial<Persisted>) => {
    set(patch);
    const { events, settings } = get();
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ events, settings })).catch(() => {});
  };

  return {
    events: [],
    settings: DEFAULT_SETTINGS,
    hydrated: false,

    hydrate: async () => {
      const data = await loadPersisted();
      set({ ...data, hydrated: true });
    },

    addEvent: input => {
      const event: BloopEvent = { photos: [], ...input, id: newId(), createdAt: Date.now() };
      commit({ events: [...get().events, event] });
      return event;
    },

    addMany: list => {
      const existing = new Set(get().events.map(e => dedupeKey(e.name, e.month, e.day)));
      const fresh: BloopEvent[] = [];
      for (const item of list) {
        const key = dedupeKey(item.name, item.month, item.day);
        if (existing.has(key)) continue;
        existing.add(key);
        fresh.push({ photos: [], ...item, id: newId(), createdAt: Date.now() });
      }
      if (fresh.length) commit({ events: [...get().events, ...fresh] });
      return fresh.length;
    },

    updateEvent: (id, patch) =>
      commit({ events: get().events.map(e => (e.id === id ? { ...e, ...patch, id } : e)) }),

    removeEvent: id => commit({ events: get().events.filter(e => e.id !== id) }),

    addPhotos: (id, uris) =>
      commit({
        events: get().events.map(e =>
          e.id === id ? { ...e, photos: Array.from(new Set([...e.photos, ...uris])) } : e,
        ),
      }),

    removePhoto: (id, uri) =>
      commit({
        events: get().events.map(e =>
          e.id === id ? { ...e, photos: e.photos.filter(p => p !== uri) } : e,
        ),
      }),

    updateSettings: patch => commit({ settings: { ...get().settings, ...patch } }),

    setDefaultRules: rules => commit({ settings: { ...get().settings, defaultRules: rules } }),

    resetAll: () => commit({ events: [], settings: { ...DEFAULT_SETTINGS, onboarded: true } }),
  };
});
