import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { daysInMonth, MONTHS_SHORT } from '../lib/dates';
import { colors, spacing, type } from '../theme';
import { Tap } from './ui';
import { Wheel } from './Wheel';

interface Props {
  month: number;
  day: number;
  year?: number;
  onChange: (v: { month: number; day: number; year?: number }) => void;
}

const THIS_YEAR = new Date().getFullYear();

/** Day / Month / Year wheels. Year is optional, because most friends' birth years are unknown. */
export function DateWheels({ month, day, year, onChange }: Props) {
  const dayCount = daysInMonth(month, year);
  const days = useMemo(
    () => Array.from({ length: dayCount }, (_, i) => ({ value: i + 1, label: String(i + 1) })),
    [dayCount],
  );
  const months = useMemo(() => MONTHS_SHORT.map((m, i) => ({ value: i + 1, label: m })), []);
  const years = useMemo(
    () => Array.from({ length: THIS_YEAR - 1920 + 1 }, (_, i) => ({ value: THIS_YEAR - i, label: String(THIS_YEAR - i) })),
    [],
  );
  const safeDay = Math.min(day, dayCount);

  return (
    <View>
      <View style={styles.row}>
        <Wheel items={days} value={safeDay} onChange={d => onChange({ month, day: d, year })} width={76} testID="wheel-day" />
        <Wheel items={months} value={month} onChange={m => onChange({ month: m, day: Math.min(day, daysInMonth(m, year)), year })} width={96} testID="wheel-month" />
        {year !== undefined ? (
          <Wheel
            items={years}
            value={year}
            onChange={y => onChange({ month, day: Math.min(day, daysInMonth(month, y)), year: y })}
            width={96}
            testID="wheel-year"
          />
        ) : (
          <View style={styles.noYear}>
            <Text style={[type.small, { textAlign: 'center' }]}>Year{'\n'}unknown</Text>
          </View>
        )}
      </View>
      <Tap
        onPress={() => onChange({ month, day: safeDay, year: year === undefined ? THIS_YEAR - 25 : undefined })}
        style={styles.toggle}
        testID="toggle-year">
        <Text style={[type.h3, { color: colors.forest, fontSize: 14 }]}>
          {year === undefined ? 'I know their birth year' : "I don't know their birth year"}
        </Text>
      </Tap>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  noYear: { width: 96, alignItems: 'center', justifyContent: 'center' },
  toggle: { alignSelf: 'center', marginTop: spacing.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
});
