import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BannerSlot } from '../components/AdSlots';
import { Icon, IconName } from '../components/Icon';
import { Tap } from '../components/ui';
import { colors, radius, spacing, type } from '../theme';

const ICONS: Record<string, { icon: IconName; label: string }> = {
  Home: { icon: 'gift', label: 'Upcoming' },
  Circle: { icon: 'users', label: 'Circle' },
  Settings: { icon: 'sliders', label: 'Settings' },
};

/** Floating pill tab bar with the ad banner docked above it. */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <BannerSlot />
      <View style={[styles.bar, { marginBottom: Math.max(insets.bottom, spacing.md) }]}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const meta = ICONS[route.name];
          return (
            <Tap
              key={route.key}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              accessibilityLabel={meta.label}
              testID={`tab-${route.name}`}
              style={[styles.item, focused && styles.itemOn]}>
              <View style={styles.itemInner}>
                <Icon name={meta.icon} size={20} color={focused ? colors.forest : colors.lime} />
                {focused ? <Text style={styles.label}>{meta.label}</Text> : null}
              </View>
            </Tap>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  bar: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: colors.forest,
    borderRadius: radius.pill,
    padding: 6,
    gap: 4,
    marginTop: spacing.sm,
  },
  item: { height: 48, minWidth: 56, borderRadius: radius.pill, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  itemOn: { backgroundColor: colors.lime },
  itemInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { ...type.h3, fontSize: 14, color: colors.forest },
});
