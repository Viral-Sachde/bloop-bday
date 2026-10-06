import React, { useEffect, useRef } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, type } from '../theme';

export const ITEM_H = 44;
const VISIBLE = 5;

interface Props<T extends string | number> {
  items: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
  width?: number;
  testID?: string;
}

/** Snap-to-row picker column. Controlled: scrolls itself when `value` changes from outside. */
export function Wheel<T extends string | number>({ items, value, onChange, width = 84, testID }: Props<T>) {
  const ref = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const index = Math.max(0, items.findIndex(i => i.value === value));
  const lastReported = useRef(index);

  useEffect(() => {
    // Defer one tick so the content is laid out before we scroll.
    const t = setTimeout(() => ref.current?.scrollTo({ y: index * ITEM_H, animated: false }), 0);
    return () => clearTimeout(t);
  }, [index, items.length]);

  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.min(items.length - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.y / ITEM_H)));
    if (i !== lastReported.current) {
      lastReported.current = i;
      onChange(items[i].value);
    }
  };

  return (
    <View style={{ width, height: ITEM_H * VISIBLE }} testID={testID}>
      <View pointerEvents="none" style={styles.band} />
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        onMomentumScrollEnd={settle}
        onScrollEndDrag={settle}
        contentContainerStyle={{ paddingVertical: ITEM_H * 2 }}>
        {items.map((it, i) => (
          <View key={String(it.value)} style={styles.item}>
            <Text style={[styles.text, i === index && styles.textActive]}>{it.label}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ITEM_H * 2,
    height: ITEM_H,
    borderRadius: radius.md,
    backgroundColor: colors.mint,
  },
  item: { height: ITEM_H, alignItems: 'center', justifyContent: 'center' },
  text: { ...type.body, fontSize: 18, color: colors.muted },
  textActive: { fontFamily: type.h2.fontFamily, fontSize: 22, color: colors.forest },
});
