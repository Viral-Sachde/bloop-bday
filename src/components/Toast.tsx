import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing, type } from '../theme';

type Listener = (msg: string) => void;
const listeners = new Set<Listener>();

export function showToast(message: string) {
  listeners.forEach(l => l(message));
}

/** Mount once near the root. */
export function ToastHost() {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState('');
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const l: Listener = msg => {
      setMessage(msg);
      if (timer.current) clearTimeout(timer.current);
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
      timer.current = setTimeout(
        () => Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(),
        2200,
      );
    };
    listeners.add(l);
    return () => {
      listeners.delete(l);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [opacity]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.toast, { bottom: insets.bottom + 110, opacity }]}
      accessibilityLiveRegion="polite"
      testID="toast">
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    maxWidth: '86%',
    backgroundColor: colors.forest,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  text: { ...type.h3, color: colors.lime, textAlign: 'center' },
});
