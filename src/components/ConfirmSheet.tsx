import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, type } from '../theme';
import { BottomSheet } from './BottomSheet';
import { Button } from './ui';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  bullets?: string[];
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** "Are you sure?" sheet: a big confirm button and a quiet "No, nevermind". */
export function ConfirmSheet({
  visible,
  title,
  message,
  bullets,
  confirmLabel,
  cancelLabel = 'No, nevermind',
  destructive,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <BottomSheet visible={visible} onClose={onCancel} testID="confirm-sheet">
      <Text style={[type.h1, { fontSize: 26, lineHeight: 32 }]}>{title}</Text>
      <Text style={[type.body, { marginTop: spacing.md, color: colors.muted }]}>{message}</Text>
      {bullets?.length ? (
        <View style={{ marginTop: spacing.md }}>
          {bullets.map(b => (
            <View key={b} style={styles.bulletRow}>
              <Text style={styles.dot}>•</Text>
              <Text style={[type.body, { flex: 1 }]}>{b}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <View style={{ marginTop: spacing.xl }}>
        <Button
          label={confirmLabel}
          kind={destructive ? 'danger' : 'primary'}
          onPress={onConfirm}
          testID="confirm-yes"
        />
        <View style={{ height: spacing.sm }} />
        <Button label={cancelLabel} kind="ghost" onPress={onCancel} testID="confirm-no" />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  bulletRow: { flexDirection: 'row', marginBottom: 4 },
  dot: { ...type.body, width: 16, color: colors.forest },
});
