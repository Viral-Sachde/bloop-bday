import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ReminderRule } from '../types';
import { makeRule } from '../lib/reminders';
import { colors, spacing, type } from '../theme';
import { BottomSheet } from './BottomSheet';
import { Button, Chip, SectionLabel } from './ui';
import { Wheel } from './Wheel';

const HOURS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: String(i + 1) }));
const MINUTES = Array.from({ length: 60 }, (_, i) => ({ value: i, label: String(i).padStart(2, '0') }));
const MERIDIEM = [
  { value: 'AM', label: 'AM' },
  { value: 'PM', label: 'PM' },
];
const DAYS_BEFORE = [
  { v: 0, label: 'On the day' },
  { v: 1, label: '1 day before' },
  { v: 2, label: '2 days' },
  { v: 3, label: '3 days' },
  { v: 7, label: '1 week' },
];

interface Props {
  visible: boolean;
  initial?: ReminderRule;
  onClose: () => void;
  onSave: (rule: ReminderRule) => void;
}

export function TimePickerSheet({ visible, initial, onClose, onSave }: Props) {
  const start = initial ?? makeRule(1, 23, 55);
  const [daysBefore, setDaysBefore] = useState(start.daysBefore);
  const [hour12, setHour12] = useState(start.hour % 12 === 0 ? 12 : start.hour % 12);
  const [minute, setMinute] = useState(start.minute);
  const [meridiem, setMeridiem] = useState<'AM' | 'PM'>(start.hour < 12 ? 'AM' : 'PM');

  useEffect(() => {
    if (!visible) return;
    const s = initial ?? makeRule(1, 23, 55);
    setDaysBefore(s.daysBefore);
    setHour12(s.hour % 12 === 0 ? 12 : s.hour % 12);
    setMinute(s.minute);
    setMeridiem(s.hour < 12 ? 'AM' : 'PM');
  }, [visible, initial]);

  const hour24 = useMemo(() => (hour12 % 12) + (meridiem === 'PM' ? 12 : 0), [hour12, meridiem]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="REMIND ME"
      tone="paper"
      testID="time-sheet"
      footer={
        <Button
          label="Save reminder"
          testID="time-save"
          onPress={() => onSave(makeRule(daysBefore, hour24, minute))}
        />
      }>
      <SectionLabel>When</SectionLabel>
      <View style={styles.chips}>
        {DAYS_BEFORE.map(d => (
          <Chip
            key={d.v}
            label={d.label}
            selected={daysBefore === d.v}
            onPress={() => setDaysBefore(d.v)}
            style={{ marginRight: spacing.sm, marginBottom: spacing.sm }}
          />
        ))}
      </View>
      <SectionLabel style={{ marginTop: spacing.md }}>At</SectionLabel>
      <View style={styles.wheels}>
        <Wheel items={HOURS} value={hour12} onChange={setHour12} width={72} testID="wheel-hour" />
        <Text style={styles.colon}>:</Text>
        <Wheel items={MINUTES} value={minute} onChange={setMinute} width={72} testID="wheel-minute" />
        <Wheel items={MERIDIEM} value={meridiem} onChange={v => setMeridiem(v as 'AM' | 'PM')} width={72} testID="wheel-meridiem" />
      </View>
      <Text style={[type.small, { textAlign: 'center', marginTop: spacing.sm }]}>
        Tip: 12:00 AM on the day is the stroke of midnight.
      </Text>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  wheels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  colon: { ...type.h1, color: colors.forest, marginHorizontal: 2 },
});
