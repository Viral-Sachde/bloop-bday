import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee from '@notifee/react-native';
import { rescheduleAll, sendTestBloop } from '../src/services/notifications';
import { shouldShowInterstitial } from '../src/services/ads';
import { smsUrl, whatsappUrl } from '../src/services/share';
import { DEFAULT_SETTINGS, STORAGE_KEY, useStore } from '../src/store';
import { dayWindow } from '../src/services/gallery';

const base = { kind: 'birthday' as const, relation: 'friend' as const, source: 'manual' as const };

beforeEach(async () => {
  Platform.OS = 'android';
  await AsyncStorage.clear();
  useStore.setState({ events: [], settings: DEFAULT_SETTINGS, hydrated: false });
  jest.clearAllMocks();
});

describe('store', () => {
  test('add, update, remove persist to storage', async () => {
    const e = useStore.getState().addEvent({ ...base, name: 'Aman', month: 10, day: 12 });
    useStore.getState().updateEvent(e.id, { name: 'Aman G' });
    let saved = JSON.parse((await AsyncStorage.getItem(STORAGE_KEY))!);
    expect(saved.events[0].name).toBe('Aman G');
    useStore.getState().removeEvent(e.id);
    saved = JSON.parse((await AsyncStorage.getItem(STORAGE_KEY))!);
    expect(saved.events).toHaveLength(0);
  });

  test('hydrate restores data and tolerates corruption', async () => {
    useStore.getState().addEvent({ ...base, name: 'Riya', month: 7, day: 3 });
    useStore.setState({ events: [], hydrated: false });
    await useStore.getState().hydrate();
    expect(useStore.getState().events.map(e => e.name)).toEqual(['Riya']);
    expect(useStore.getState().hydrated).toBe(true);

    await AsyncStorage.setItem(STORAGE_KEY, '{not json');
    await useStore.getState().hydrate();
    expect(useStore.getState().events).toEqual([]);
  });

  test('addMany skips duplicates (case/space-insensitive) and reports new count', () => {
    const { addMany } = useStore.getState();
    expect(addMany([{ ...base, name: 'Aman', month: 10, day: 12 }, { ...base, name: 'aman ', month: 10, day: 12 }])).toBe(1);
    expect(addMany([{ ...base, name: 'AMAN', month: 10, day: 12 }, { ...base, name: 'Aman', month: 10, day: 13 }])).toBe(1);
    expect(useStore.getState().events).toHaveLength(2);
  });

  test('photos are de-duplicated and removable', () => {
    const e = useStore.getState().addEvent({ ...base, name: 'Aman', month: 10, day: 12 });
    useStore.getState().addPhotos(e.id, ['a', 'b']);
    useStore.getState().addPhotos(e.id, ['b', 'c']);
    expect(useStore.getState().events[0].photos).toEqual(['a', 'b', 'c']);
    useStore.getState().removePhoto(e.id, 'b');
    expect(useStore.getState().events[0].photos).toEqual(['a', 'c']);
  });

  test('resetAll keeps onboarding done', () => {
    useStore.getState().addEvent({ ...base, name: 'Aman', month: 10, day: 12 });
    useStore.getState().resetAll();
    expect(useStore.getState().events).toEqual([]);
    expect(useStore.getState().settings.onboarded).toBe(true);
  });
});

describe('notifications', () => {
  const events = [
    { ...base, id: 'a', name: 'Aman', month: 10, day: 12, photos: [], createdAt: 0 },
    { ...base, id: 'b', name: 'Riya', month: 7, day: 3, photos: [], createdAt: 0, reminders: [] },
  ];
  const now = new Date(2026, 9, 6, 10, 0);

  test('cancels old alarms then schedules exact-time triggers', async () => {
    const n = await rescheduleAll(events, { defaultRules: DEFAULT_SETTINGS.defaultRules, notificationsEnabled: true }, now);
    expect(notifee.cancelTriggerNotifications).toHaveBeenCalledTimes(1);
    expect(n).toBe(4); // Aman x 2 rules x 2 years, Riya has none
    const calls = (notifee.createTriggerNotification as jest.Mock).mock.calls;
    const stamps = calls.map(c => c[1].timestamp).sort();
    expect(stamps[0]).toBe(new Date(2026, 9, 11, 23, 55).getTime());
    expect(stamps[1]).toBe(new Date(2026, 9, 12, 0, 0).getTime());
    expect(calls[0][1].alarmManager).toEqual({ allowWhileIdle: true });
    expect(calls[0][0].data).toEqual({ eventId: 'a' });
  });

  test('master switch off cancels and schedules nothing', async () => {
    const n = await rescheduleAll(events, { defaultRules: DEFAULT_SETTINGS.defaultRules, notificationsEnabled: false }, now);
    expect(n).toBe(0);
    expect(notifee.cancelTriggerNotifications).toHaveBeenCalled();
    expect(notifee.createTriggerNotification).not.toHaveBeenCalled();
  });

  test('without exact-alarm permission it still schedules (inexact)', async () => {
    (notifee.getNotificationSettings as jest.Mock).mockResolvedValueOnce({ authorizationStatus: 1, android: { alarm: 0 } });
    await rescheduleAll([events[0]], { defaultRules: DEFAULT_SETTINGS.defaultRules, notificationsEnabled: true }, now);
    const first = (notifee.createTriggerNotification as jest.Mock).mock.calls[0];
    expect(first[1].alarmManager).toBeUndefined();
  });

  test('test bloop fires ~5s out', async () => {
    const before = Date.now();
    await sendTestBloop(undefined, 5);
    const ts = (notifee.createTriggerNotification as jest.Mock).mock.calls[0][1].timestamp;
    expect(ts - before).toBeGreaterThanOrEqual(4900);
    expect(ts - before).toBeLessThan(7000);
  });
});

describe('helpers', () => {
  test('interstitial frequency cap', () => {
    expect(shouldShowInterstitial(1000, 0, 500)).toBe(true);
    expect(shouldShowInterstitial(1000, 700, 500)).toBe(false);
  });
  test('share urls', () => {
    expect(whatsappUrl('Hi there', '+91 98765-43210')).toBe('whatsapp://send?phone=919876543210&text=Hi%20there');
    expect(whatsappUrl('Hi')).toBe('whatsapp://send?text=Hi');
    expect(smsUrl('Hi & bye', '098 76')).toBe('sms:09876?body=Hi%20%26%20bye');
  });
  test('dayWindow spans exactly one local day', () => {
    const { from, to } = dayWindow(2026, 10, 12);
    expect(new Date(from)).toEqual(new Date(2026, 9, 12));
    expect(new Date(to)).toEqual(new Date(2026, 9, 13));
  });
});
