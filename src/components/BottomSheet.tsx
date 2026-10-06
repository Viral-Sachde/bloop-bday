import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fillAbs, radius, spacing, type } from '../theme';
import { Icon } from './Icon';

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Pinned under the scroll area (e.g. Apply / Clear all). */
  footer?: React.ReactNode;
  /** Tint of the sheet. The deep-forest variant is used for confirmations. */
  tone?: 'cream' | 'paper';
  testID?: string;
}

const { height: SCREEN_H } = Dimensions.get('window');

/**
 * Modal bottom sheet in the Blue-Apron mould: rounded top corners, a title
 * row with a close X, and a pinned footer.
 */
export function BottomSheet({ visible, onClose, title, children, footer, tone = 'paper', testID }: Props) {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(progress, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else if (mounted) {
      Animated.timing(progress, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => finished && setMounted(false));
    }
  }, [visible, mounted, progress]);

  if (!mounted) return null;

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_H, 0] });

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View style={[styles.scrim, { opacity: progress }]}>
          <Pressable style={styles.fill} onPress={onClose} accessibilityLabel="Close" />
        </Animated.View>
        <Animated.View
          testID={testID}
          style={[
            styles.sheet,
            { backgroundColor: tone === 'paper' ? colors.paper : colors.cream, transform: [{ translateY }] },
          ]}>
          <View style={styles.handle} />
          {title ? (
            <View style={styles.header}>
              <Text style={[type.label, { color: colors.ink, letterSpacing: 2 }]}>{title}</Text>
              <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close sheet" style={styles.close}>
                <Icon name="x" size={22} color={colors.ink} />
              </Pressable>
            </View>
          ) : null}
          <ScrollView
            style={{ flexGrow: 0 }}
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
          {footer ? (
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>{footer}</View>
          ) : (
            <View style={{ height: Math.max(insets.bottom, spacing.md) }} />
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scrim: { ...fillAbs, backgroundColor: 'rgba(10,28,16,0.55)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: SCREEN_H * 0.88,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  close: { position: 'absolute', right: spacing.xl },
  body: { padding: spacing.xl, paddingTop: spacing.lg },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    backgroundColor: colors.cream,
  },
});
