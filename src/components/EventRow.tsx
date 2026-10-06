import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { countdownLabel, daysUntil, formatMonthDay, nextOccurrence, turningAge } from '../lib/dates';
import { eventNoun } from '../lib/reminders';
import { colors, radius, spacing, type } from '../theme';
import { BloopEvent } from '../types';
import { Icon } from './Icon';
import { Avatar, Pill, Tap } from './ui';

export function subtitleFor(e: BloopEvent, now: Date = new Date()): string {
  const occ = nextOccurrence(e.month, e.day, now);
  const age = e.kind === 'birthday' ? turningAge(e.year, occ) : undefined;
  const base = e.kind === 'birthday' ? '' : `${eventNoun(e)} · `;
  return `${base}${formatMonthDay(e.month, e.day)}${age ? ` · turning ${age}` : ''}`;
}

export function EventRow({ event, onPress, now }: { event: BloopEvent; onPress: () => void; now?: Date }) {
  const days = daysUntil(event.month, event.day, now);
  return (
    <Tap onPress={onPress} style={styles.row} testID={`event-row-${event.name}`} accessibilityLabel={`${event.name}, ${countdownLabel(days)}`}>
      <Avatar name={event.name} size={48} />
      <View style={styles.mid}>
        <Text style={type.h3} numberOfLines={1}>
          {event.name}
        </Text>
        <Text style={type.small} numberOfLines={1}>
          {subtitleFor(event, now)}
        </Text>
      </View>
      <Pill label={countdownLabel(days)} tone={days === 0 ? 'forest' : days <= 7 ? 'lime' : 'plain'} />
      <Icon name="chevron-right" size={18} color={colors.muted} />
    </Tap>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  mid: { flex: 1 },
});
