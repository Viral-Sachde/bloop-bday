import { useNavigation } from '@react-navigation/native';
import React, { useRef, useState } from 'react';
import { Animated, Dimensions, FlatList, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Rect } from 'react-native-svg';
import { Icon, IconName } from '../components/Icon';
import { LogoTile } from '../components/Logo';
import { Button } from '../components/ui';
import { requestNotificationPermission } from '../services/notifications';
import { useStore } from '../store';
import { colors, radius, spacing, type } from '../theme';

const { width: W } = Dimensions.get('window');

const SLIDES: Array<{ key: string; icon: IconName | 'logo'; title: string; body: string }> = [
  {
    key: 'midnight',
    icon: 'logo',
    title: 'Never miss a midnight.',
    body: 'Bloop pings you right before 12:00 AM, and again at the stroke of midnight, so your wish lands first.',
  },
  {
    key: 'circle',
    icon: 'users',
    title: 'Bring your circle in.',
    body: 'Pull birthdays from your contacts, import a calendar file, or paste a list. Everything stays on your phone.',
  },
  {
    key: 'wish',
    icon: 'gift',
    title: 'Wishes and memories, ready.',
    body: 'Pick a wish in the right tone, and see photos from past birthdays without digging through your gallery.',
  },
];

function Art({ icon }: { icon: IconName | 'logo' }) {
  return (
    <View style={styles.art}>
      <Svg width={240} height={240} style={StyleSheet.absoluteFill}>
        <Circle cx={120} cy={120} r={112} fill={colors.mint} />
        <Circle cx={120} cy={120} r={78} fill={colors.lime} opacity={0.55} />
        <Rect x={30} y={60} width={14} height={6} rx={3} fill={colors.butter} transform="rotate(-30 37 63)" />
        <Rect x={198} y={176} width={14} height={6} rx={3} fill={colors.forest} transform="rotate(35 205 179)" />
        <Circle cx={206} cy={58} r={6} fill={colors.butter} />
        <Circle cx={36} cy={188} r={5} fill={colors.forest} />
      </Svg>
      {icon === 'logo' ? (
        <LogoTile size={112} />
      ) : (
        <Icon name={icon} size={84} color={colors.forest} strokeWidth={1.6} />
      )}
    </View>
  );
}

export function OnboardingScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const update = useStore(s => s.updateSettings);
  const [index, setIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const list = useRef<FlatList>(null);
  const last = index === SLIDES.length - 1;

  const finish = async (askNotifications: boolean) => {
    if (askNotifications) {
      try {
        await requestNotificationPermission();
      } catch {
        // The user can enable this later in Settings.
      }
    }
    update({ onboarded: true });
    nav.reset({ index: 0, routes: [{ name: 'Tabs' }] });
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, spacing.lg) }]} testID="onboarding">
      <StatusBar barStyle="dark-content" />
      <View style={styles.top}>
        <Text style={styles.brand}>bloop</Text>
        {!last ? (
          <Text style={[type.h3, { color: colors.muted }]} onPress={() => finish(false)} accessibilityRole="button" testID="onboarding-skip">
            Skip
          </Text>
        ) : null}
      </View>
      <Animated.FlatList
        ref={list}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={s => s.key}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
        onMomentumScrollEnd={e => setIndex(Math.round(e.nativeEvent.contentOffset.x / W))}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <Art icon={item.icon} />
            <Text style={[type.display, styles.title]}>{item.title}</Text>
            <Text style={[type.body, styles.body]}>{item.body}</Text>
          </View>
        )}
      />
      <View style={styles.dots}>
        {SLIDES.map((s, i) => {
          const range = [(i - 1) * W, i * W, (i + 1) * W];
          const scaleX = scrollX.interpolate({ inputRange: range, outputRange: [0.31, 1, 0.31], extrapolate: 'clamp' });
          const opacity = scrollX.interpolate({ inputRange: range, outputRange: [0.35, 1, 0.35], extrapolate: 'clamp' });
          return <Animated.View key={s.key} style={[styles.dot, { opacity, transform: [{ scaleX }] }]} />;
        })}
      </View>
      <View style={styles.actions}>
        {last ? (
          <>
            <Button label="Turn on midnight pings" icon="bell" onPress={() => finish(true)} testID="onboarding-notify" />
            <View style={{ height: spacing.sm }} />
            <Button label="Maybe later" kind="ghost" onPress={() => finish(false)} testID="onboarding-later" />
          </>
        ) : (
          <Button
            label="Continue"
            testID="onboarding-next"
            onPress={() => {
              const next = index + 1;
              list.current?.scrollToOffset({ offset: next * W, animated: true });
              setIndex(next);
            }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xl, height: 56 },
  brand: { fontFamily: type.h1.fontFamily, fontSize: 34, color: colors.forest },
  slide: { width: W, paddingHorizontal: spacing.xl, alignItems: 'center', justifyContent: 'center' },
  art: { width: 240, height: 240, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl },
  title: { textAlign: 'center', color: colors.forest },
  body: { textAlign: 'center', color: colors.muted, marginTop: spacing.md, maxWidth: 320 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginVertical: spacing.lg },
  dot: { width: 26, height: 8, borderRadius: radius.pill, backgroundColor: colors.forest },
  actions: { paddingHorizontal: spacing.xl },
});
