import React, { useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { avatarPalette, colors, radius, spacing, type } from '../theme';
import { Icon, IconName } from './Icon';

/** Pressable with a springy scale, so every tap feels alive. */
export function Tap({
  children,
  style,
  onPress,
  disabled,
  accessibilityLabel,
  testID,
  hitSlop,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  testID?: string;
  hitSlop?: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) =>
    Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => to(0.97)}
      onPressOut={() => to(1)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      hitSlop={hitSlop}>
      <Animated.View style={[style, { transform: [{ scale }] }, disabled && { opacity: 0.45 }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

type ButtonKind = 'primary' | 'lime' | 'ghost' | 'danger' | 'outline';

export function Button({
  label,
  onPress,
  kind = 'primary',
  icon,
  disabled,
  style,
  testID,
}: {
  label: string;
  onPress?: () => void;
  kind?: ButtonKind;
  icon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const palette: Record<ButtonKind, { bg: string; fg: string; border?: string }> = {
    primary: { bg: colors.forest, fg: colors.lime },
    lime: { bg: colors.lime, fg: colors.forest },
    ghost: { bg: 'transparent', fg: colors.forest },
    danger: { bg: colors.danger, fg: '#FFFFFF' },
    outline: { bg: 'transparent', fg: colors.forest, border: colors.forest },
  };
  const c = palette[kind];
  return (
    <Tap
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      accessibilityLabel={label}
      style={[
        styles.button,
        { backgroundColor: c.bg, borderColor: c.border ?? 'transparent', borderWidth: c.border ? 1.5 : 0 },
        style,
      ]}>
      <View style={styles.row}>
        {icon ? <Icon name={icon} size={18} color={c.fg} /> : null}
        <Text style={[type.button, { color: c.fg }, icon ? { marginLeft: 8 } : null]}>{label}</Text>
      </View>
    </Tap>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  onRemove,
  emoji,
  style,
  testID,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  onRemove?: () => void;
  emoji?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  return (
    <Tap
      onPress={onPress ?? onRemove}
      testID={testID}
      accessibilityLabel={label}
      style={[
        styles.chip,
        selected ? { backgroundColor: colors.mint, borderColor: colors.forest } : null,
        style,
      ]}>
      <View style={styles.row}>
        {emoji ? <Text style={{ marginRight: 6, fontSize: 15 }}>{emoji}</Text> : null}
        <Text style={[type.h3, { fontSize: 14, color: colors.forest }]}>{label}</Text>
        {onRemove ? (
          <View style={{ marginLeft: 8 }}>
            <Icon name="x" size={14} color={colors.forest} strokeWidth={2.5} />
          </View>
        ) : null}
      </View>
    </Tap>
  );
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function paletteFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return avatarPalette[h % avatarPalette.length];
}

export function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  const pal = paletteFor(name);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: pal.bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text style={{ fontFamily: type.h2.fontFamily, fontSize: size * 0.5, color: pal.fg }}>
        {initials(name)}
      </Text>
    </View>
  );
}

export function SectionLabel({ children, style }: { children: string; style?: StyleProp<TextStyle> }) {
  return <Text style={[type.label, { marginBottom: spacing.sm }, style]}>{children}</Text>;
}

export function Divider() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.line }} />;
}

export function IconButton({
  name,
  onPress,
  color = colors.forest,
  bg = colors.paper,
  size = 44,
  label,
  testID,
}: {
  name: IconName;
  onPress?: () => void;
  color?: string;
  bg?: string;
  size?: number;
  label: string;
  testID?: string;
}) {
  return (
    <Tap
      onPress={onPress}
      accessibilityLabel={label}
      testID={testID}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Icon name={name} size={size * 0.46} color={color} />
    </Tap>
  );
}

/** Pill showing "3 days". */
export function Pill({ label, tone = 'lime' }: { label: string; tone?: 'lime' | 'forest' | 'butter' | 'plain' }) {
  const map = {
    lime: { bg: colors.lime, fg: colors.forest },
    forest: { bg: colors.forest, fg: colors.lime },
    butter: { bg: colors.butter, fg: '#3A3410' },
    plain: { bg: colors.creamDeep, fg: colors.forest },
  }[tone];
  return (
    <View style={[styles.pill, { backgroundColor: map.bg }]}>
      <Text style={[type.h3, { fontSize: 12, color: map.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  button: {
    minHeight: 54,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  pill: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
});
