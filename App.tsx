import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastHost } from './src/components/Toast';
import { navigationRef, RootNavigator } from './src/navigation';
import { SplashScreen } from './src/screens/SplashScreen';
import { initAds, preloadInterstitial } from './src/services/ads';
import {
  ensureChannel,
  getLaunchEventId,
  onNotificationPress,
  rescheduleAll,
} from './src/services/notifications';
import { useStore } from './src/store';
import { colors } from './src/theme';

function useReminderSync(ready: boolean) {
  const events = useStore(s => s.events);
  const rules = useStore(s => s.settings.defaultRules);
  const enabled = useStore(s => s.settings.notificationsEnabled);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Rebuild alarms whenever the circle or the rules change (debounced).
  useEffect(() => {
    if (!ready) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      rescheduleAll(events, { defaultRules: rules, notificationsEnabled: enabled }).catch(() => {});
    }, 400);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [ready, events, rules, enabled]);

  // And again whenever the app comes back to the foreground: tops up next year's alarms.
  useEffect(() => {
    if (!ready) return;
    const sub = AppState.addEventListener('change', s => {
      if (s !== 'active') return;
      const { events: e, settings } = useStore.getState();
      rescheduleAll(e, settings).catch(() => {});
    });
    return () => sub.remove();
  }, [ready]);
}

function App() {
  const hydrated = useStore(s => s.hydrated);
  const [splashDone, setSplashDone] = useState(false);
  const [navReady, setNavReady] = useState(false);

  useEffect(() => {
    useStore.getState().hydrate();
    ensureChannel().catch(() => {});
    initAds().then(preloadInterstitial);
  }, []);

  useReminderSync(hydrated);

  const openPerson = useCallback((id: string) => {
    if (!navigationRef.isReady()) return;
    if (useStore.getState().events.some(e => e.id === id)) {
      navigationRef.navigate('Person', { id, openWishes: true });
    }
  }, []);

  useEffect(() => onNotificationPress(openPerson), [openPerson]);

  useEffect(() => {
    if (!hydrated || !navReady) return;
    getLaunchEventId().then(id => id && openPerson(id)).catch(() => {});
  }, [hydrated, navReady, openPerson]);

  const onDone = useCallback(() => setSplashDone(true), []);

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        {hydrated ? <RootNavigator onReady={() => setNavReady(true)} /> : null}
        <ToastHost />
        {!splashDone ? <SplashScreen onDone={onDone} /> : null}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.forest } });

export default App;
