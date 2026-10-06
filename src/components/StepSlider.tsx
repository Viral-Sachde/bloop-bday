import React, { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, type } from '../theme';

interface Props<T extends number> {
  steps: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
  testID?: string;
}

/**
 * The stepped slider from the filter sheet: a track with labelled stops and a
 * forest thumb. Tap a stop to move to it.
 */
export function StepSlider<T extends number>({ steps, value, onChange, testID }: Props<T>) {
  const [width, setWidth] = useState(0);
  const idx = Math.max(0, steps.findIndex(s => s.value === value));
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const pct = steps.length > 1 ? idx / (steps.length - 1) : 0;
  const thumb = 28;
  const usable = Math.max(0, width - thumb);

  return (
    <View testID={testID}>
      <View onLayout={onLayout} style={styles.trackWrap}>
        <View style={styles.track} />
        <View style={[styles.fill, { width: thumb / 2 + usable * pct }]} />
        <View style={[styles.thumb, { left: usable * pct, width: thumb, height: thumb, borderRadius: thumb / 2 }]} />
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <View style={styles.hitRow}>
            {steps.map((s, i) => (
              <Pressable
                key={s.value}
                style={styles.hit}
                onPress={() => onChange(s.value)}
                accessibilityRole="button"
                accessibilityLabel={`Within ${s.label}`}
                testID={`${testID}-step-${i}`}
              />
            ))}
          </View>
        </View>
      </View>
      <View style={styles.labels}>
        {steps.map((s, i) => (
          <Text key={s.value} style={[type.small, i === idx && { color: colors.forest, fontFamily: fonts.sansSemiBold }]}>
            {s.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  trackWrap: { height: 40, justifyContent: 'center' },
  track: { height: 4, borderRadius: 2, backgroundColor: colors.line },
  fill: { position: 'absolute', height: 4, borderRadius: 2, backgroundColor: colors.forest },
  thumb: { position: 'absolute', backgroundColor: colors.forest, borderWidth: 4, borderColor: colors.lime },
  hitRow: { flex: 1, flexDirection: 'row' },
  hit: { flex: 1 },
  labels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
});
