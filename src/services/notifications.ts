import notifee, {
  AndroidImportance,
  AndroidNotificationSetting,
  AndroidVisibility,
  EventType,
  TimestampTrigger,
  TriggerType,
} from '@notifee/react-native';
import { Platform } from 'react-native';
import { notificationCopy, planAll } from '../lib/reminders';
import { loadPersisted } from '../store';
import { BloopEvent, Settings } from '../types';

export const CHANNEL_ID = 'bloop-birthdays';

export async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Birthday reminders',
    description: 'Midnight and heads-up pings for the people in your circle',
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    vibration: true,
    lights: true,
    lightColor: '#E3F988',
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  const settings = await notifee.requestPermission();
  // 1 = AUTHORIZED, 2 = PROVISIONAL
  return settings.authorizationStatus >= 1;
}

export async function hasNotificationPermission(): Promise<boolean> {
  const settings = await notifee.getNotificationSettings();
  return settings.authorizationStatus >= 1;
}

/** Exact alarms are what make "12:00 AM sharp" actually sharp on Android 12+. */
export async function hasExactAlarmPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const settings = await notifee.getNotificationSettings();
  return settings.android.alarm === AndroidNotificationSetting.ENABLED;
}

export async function openExactAlarmSettings(): Promise<void> {
  if (Platform.OS === 'android') await notifee.openAlarmPermissionSettings();
}

/**
 * Cancel everything Bloop scheduled and rebuild it from the current events.
 * Ids are deterministic so this is idempotent.
 */
export async function rescheduleAll(
  events: BloopEvent[],
  settings: Pick<Settings, 'defaultRules' | 'notificationsEnabled'>,
  now: Date = new Date(),
): Promise<number> {
  await notifee.cancelTriggerNotifications();
  if (!settings.notificationsEnabled) return 0;
  await ensureChannel();

  const byId = new Map(events.map(e => [e.id, e]));
  const plan = planAll(events, settings.defaultRules, now);
  const canExact = await hasExactAlarmPermission();

  for (const item of plan) {
    const event = byId.get(item.eventId)!;
    const copy = notificationCopy(event, item.rule, item.occurrence);
    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: item.fireAt.getTime(),
      alarmManager: canExact ? { allowWhileIdle: true } : undefined,
    };
    await notifee.createTriggerNotification(
      {
        id: item.id,
        title: copy.title,
        body: copy.body,
        data: { eventId: event.id },
        android: {
          channelId: CHANNEL_ID,
          smallIcon: 'ic_stat_bloop',
          color: '#1E4D2B',
          importance: AndroidImportance.HIGH,
          pressAction: { id: 'default', launchActivity: 'default' },
          actions: [{ title: 'Send wish', pressAction: { id: 'wish', launchActivity: 'default' } }],
        },
        ios: { sound: 'default', interruptionLevel: 'timeSensitive' },
      },
      trigger,
    );
  }
  return plan.length;
}

/** Used from the headless background handler where React state does not exist. */
export async function rescheduleFromStorage(): Promise<void> {
  const { events, settings } = await loadPersisted();
  await rescheduleAll(events, settings);
}

/** A real, immediate notification so people (and QA) can see exactly what a bloop looks like. */
export async function sendTestBloop(event: BloopEvent | undefined, inSeconds = 5): Promise<void> {
  await ensureChannel();
  const name = event?.name ?? 'Someone special';
  await notifee.createTriggerNotification(
    {
      id: 'bloop-test',
      title: `It's ${name}'s birthday! 🎉`,
      body: '12:00 AM sharp. Be the first to wish.',
      data: event ? { eventId: event.id } : {},
      android: {
        channelId: CHANNEL_ID,
        smallIcon: 'ic_stat_bloop',
        color: '#1E4D2B',
        pressAction: { id: 'default', launchActivity: 'default' },
        actions: [{ title: 'Send wish', pressAction: { id: 'wish', launchActivity: 'default' } }],
      },
    },
    {
      type: TriggerType.TIMESTAMP,
      timestamp: Date.now() + inSeconds * 1000,
      alarmManager: (await hasExactAlarmPermission()) ? { allowWhileIdle: true } : undefined,
    },
  );
}

export async function getLaunchEventId(): Promise<string | undefined> {
  const initial = await notifee.getInitialNotification();
  const id = initial?.notification?.data?.eventId;
  return typeof id === 'string' ? id : undefined;
}

export function onNotificationPress(handler: (eventId: string) => void): () => void {
  return notifee.onForegroundEvent(({ type, detail }) => {
    if (type !== EventType.PRESS && type !== EventType.ACTION_PRESS) return;
    const id = detail.notification?.data?.eventId;
    if (typeof id === 'string') handler(id);
  });
}

/** Registered once from index.js. */
export function registerBackgroundHandler(): void {
  notifee.onBackgroundEvent(async ({ type }) => {
    // After any delivery, top the schedule back up so next year's alarms exist.
    if (type === EventType.DELIVERED) {
      try {
        await rescheduleFromStorage();
      } catch {
        // Never throw from a headless task.
      }
    }
  });
}
