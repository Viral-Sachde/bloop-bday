import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { InlineAdCard } from '../components/AdSlots';
import { EventRow, subtitleFor } from '../components/EventRow';
import { Logo, LogoTile } from '../components/Logo';
import { Button, IconButton, Tap } from '../components/ui';
import { Icon } from '../components/Icon';
import { daysUntil, exactCountdown } from '../lib/dates';
import { eventNoun, possessive, rulesFor, shortRule } from '../lib/reminders';
import { useStore } from '../store';
import { colors, radius, shadow, spacing, type } from '../theme';
import { BloopEvent } from '../types';

function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 5) return 'Still up?';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export interface Group {
  key: string;
  title: string;
  items: BloopEvent[];
}

export function groupUpcoming(events: BloopEvent[], now: Date): Group[] {
  const sorted = [...events].sort(
    (a, b) => daysUntil(a.month, a.day, now) - daysUntil(b.month, b.day, now) || a.name.localeCompare(b.name),
  );
  const buckets: Group[] = [
    { key: 'today', title: 'Today', items: [] },
    { key: 'week', title: 'This week', items: [] },
    { key: 'month', title: 'This month', items: [] },
    { key: 'later', title: 'Later', items: [] },
  ];
  for (const e of sorted) {
    const d = daysUntil(e.month, e.day, now);
    buckets[d === 0 ? 0 : d <= 7 ? 1 : d <= 30 ? 2 : 3].items.push(e);
  }
  return buckets.filter(b => b.items.length > 0);
}

export function HomeScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const events = useStore(s => s.events);
  const defaults = useStore(s => s.settings.defaultRules);
  const [now, setNow] = useState(() => new Date());

  useFocusEffect(
    useCallback(() => {
      setNow(new Date());
    }, []),
  );

  const groups = useMemo(() => groupUpcoming(events, now), [events, now]);
  const next = groups[0]?.items[0];
  const nextDays = next ? daysUntil(next.month, next.day, now) : 0;
  let rowsShown = 0;

  return (
    <View style={styles.root} testID="home">
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.xl, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={type.small}>{greeting(now)}</Text>
            <Text style={[type.h1, { color: colors.forest }]}>bloop</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <IconButton name="upload" label="Import birthdays" onPress={() => nav.navigate('Import')} testID="home-import" />
            <IconButton name="plus" label="Add person" bg={colors.forest} color={colors.lime} onPress={() => nav.navigate('Editor')} testID="home-add" />
          </View>
        </View>

        {next ? (
          <Tap
            onPress={() => nav.navigate('Person', { id: next.id })}
            style={[styles.hero, shadow]}
            testID="hero-card"
            accessibilityLabel={`Next up ${next.name}`}>
            <View style={styles.heroLogo}>
              <Logo size={130} color="#2F7045" accent="#2F7045" />
            </View>
            <Text style={styles.heroLabel}>{nextDays === 0 ? 'TODAY' : 'NEXT UP'}</Text>
            <Text style={styles.heroName} numberOfLines={2}>
              {possessive(next.name)} {eventNoun(next)}
            </Text>
            <Text style={styles.heroCount}>{exactCountdown(nextDays)}</Text>
            <Text style={styles.heroSub}>{subtitleFor(next, now)}</Text>
            <View style={styles.heroFoot}>
              <Icon name="bell" size={14} color={colors.butter} />
              <Text style={styles.heroRule} numberOfLines={1}>
                {rulesFor(next, defaults).map(shortRule).join('  ·  ') || 'No reminders set'}
              </Text>
            </View>
            <View style={styles.heroBtn}>
              <Button
                label="Pick a wish"
                kind="lime"
                icon="gift"
                onPress={() => nav.navigate('Person', { id: next.id, openWishes: true })}
                testID="hero-wish"
              />
            </View>
          </Tap>
        ) : (
          <View style={styles.empty} testID="home-empty">
            <LogoTile size={96} />
            <Text style={[type.h1, { textAlign: 'center', marginTop: spacing.lg }]}>Your circle is empty</Text>
            <Text style={[type.body, { textAlign: 'center', color: colors.muted, marginVertical: spacing.md }]}>
              Add someone, or bring birthdays in from your contacts, a calendar file or a pasted list.
            </Text>
            <Button label="Import birthdays" icon="upload" onPress={() => nav.navigate('Import')} testID="empty-import" />
            <View style={{ height: spacing.sm }} />
            <Button label="Add someone" kind="outline" icon="plus" onPress={() => nav.navigate('Editor')} testID="empty-add" />
          </View>
        )}

        {groups.map(g => (
          <View key={g.key} style={{ marginTop: spacing.xl }}>
            <Text style={[type.label, { marginBottom: spacing.md }]}>{g.title}</Text>
            {g.items.map(e => {
              rowsShown += 1;
              return (
                <React.Fragment key={e.id}>
                  <EventRow event={e} now={now} onPress={() => nav.navigate('Person', { id: e.id })} />
                  {rowsShown === 3 ? <InlineAdCard /> : null}
                </React.Fragment>
              );
            })}
          </View>
        ))}
        {events.length > 0 && events.length < 3 ? <InlineAdCard /> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  hero: { backgroundColor: colors.forest, borderRadius: radius.xl, padding: spacing.xl, overflow: 'hidden' },
  heroLogo: { position: 'absolute', right: -14, top: -14, opacity: 0.9 },
  heroLabel: { ...type.label, color: colors.butter },
  heroName: { fontFamily: type.h1.fontFamily, fontSize: 34, lineHeight: 38, color: '#FFFFFF', marginTop: spacing.sm, maxWidth: '78%' },
  heroCount: { fontFamily: type.display.fontFamily, fontSize: 60, lineHeight: 64, color: colors.lime, marginTop: spacing.sm },
  heroSub: { ...type.body, color: colors.sage, marginTop: 2 },
  heroFoot: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.lg },
  heroRule: { ...type.small, color: colors.butter, flex: 1 },
  heroBtn: { marginTop: spacing.lg },
  empty: { alignItems: 'center', backgroundColor: colors.paper, borderRadius: radius.xl, padding: spacing.xxl },
});
