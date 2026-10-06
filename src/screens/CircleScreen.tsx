import { useNavigation } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import { FlatList, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet } from '../components/BottomSheet';
import { EventRow } from '../components/EventRow';
import { Icon } from '../components/Icon';
import { StepSlider } from '../components/StepSlider';
import { Button, Chip, IconButton, SectionLabel } from '../components/ui';
import {
  applyFilters,
  EMPTY_FILTERS,
  Filters,
  isFiltered,
  KINDS,
  NO_LIMIT,
  RELATIONS,
  toggle,
} from '../lib/filters';
import { useStore } from '../store';
import { colors, radius, spacing, type } from '../theme';

const STEPS = [
  { value: 7, label: '7d' },
  { value: 30, label: '30d' },
  { value: 90, label: '90d' },
  { value: 180, label: '6mo' },
  { value: NO_LIMIT, label: 'All' },
];

export function CircleScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const events = useStore(s => s.events);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [open, setOpen] = useState(false);

  const list = useMemo(() => applyFilters(events, filters, query, new Date()), [events, filters, query]);
  const draftChips = [
    ...draft.relations.map(r => ({ key: `r-${r}`, label: RELATIONS.find(x => x.id === r)!.label, clear: () => setDraft(d => ({ ...d, relations: d.relations.filter(x => x !== r) })) })),
    ...draft.kinds.map(k => ({ key: `k-${k}`, label: KINDS.find(x => x.id === k)!.label, clear: () => setDraft(d => ({ ...d, kinds: d.kinds.filter(x => x !== k) })) })),
    ...(draft.withinDays !== NO_LIMIT
      ? [{ key: 'w', label: `Within ${STEPS.find(s => s.value === draft.withinDays)?.label}`, clear: () => setDraft(d => ({ ...d, withinDays: NO_LIMIT })) }]
      : []),
  ];

  const openFilters = () => {
    setDraft(filters);
    setOpen(true);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.md }]} testID="circle">
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={[type.h1, { color: colors.forest }]}>Circle</Text>
        <Text style={type.small}>{events.length} {events.length === 1 ? 'person' : 'people'}</Text>
      </View>
      <View style={styles.searchRow}>
        <View style={styles.search}>
          <Icon name="search" size={18} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search your circle"
            placeholderTextColor={colors.muted}
            style={styles.input}
            testID="circle-search"
            autoCorrect={false}
          />
        </View>
        <IconButton
          name="filter"
          label="Filters"
          onPress={openFilters}
          bg={isFiltered(filters) ? colors.forest : colors.paper}
          color={isFiltered(filters) ? colors.lime : colors.forest}
          testID="circle-filter"
        />
      </View>

      <FlatList
        data={list}
        keyExtractor={e => e.id}
        contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: 140, paddingTop: spacing.sm }}
        renderItem={({ item }) => <EventRow event={item} onPress={() => nav.navigate('Person', { id: item.id })} />}
        ListEmptyComponent={
          <View style={styles.empty} testID="circle-empty">
            <Text style={type.h2}>{events.length ? 'No one matches' : 'Nobody here yet'}</Text>
            <Text style={[type.small, { textAlign: 'center', marginTop: 6 }]}>
              {events.length ? 'Try clearing a filter.' : 'Add someone to start your circle.'}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      <BottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        title="FILTERS"
        tone="paper"
        testID="filter-sheet"
        footer={
          <View style={styles.footerRow}>
            <Button label="Clear all" kind="ghost" onPress={() => setDraft(EMPTY_FILTERS)} testID="filter-clear" />
            <View style={{ flex: 1 }}>
              <Button
                label="Apply"
                testID="filter-apply"
                onPress={() => {
                  setFilters(draft);
                  setOpen(false);
                }}
              />
            </View>
          </View>
        }>
        {draftChips.length > 0 ? (
          <View testID="filter-selected">
            <SectionLabel>Selected</SectionLabel>
            <View style={styles.wrap}>
              {draftChips.map(c => (
                <Chip key={c.key} label={c.label} onRemove={c.clear} selected style={styles.gap} />
              ))}
            </View>
            <View style={styles.rule} />
          </View>
        ) : null}

        <SectionLabel>Relationship</SectionLabel>
        <View style={styles.wrap}>
          {RELATIONS.map(r => (
            <Chip
              key={r.id}
              label={r.label}
              emoji={r.emoji}
              selected={draft.relations.includes(r.id)}
              onPress={() => setDraft(d => ({ ...d, relations: toggle(d.relations, r.id) }))}
              style={styles.gap}
              testID={`filter-rel-${r.id}`}
            />
          ))}
        </View>
        <View style={styles.rule} />

        <SectionLabel>Occasion</SectionLabel>
        <View style={styles.wrap}>
          {KINDS.map(k => (
            <Chip
              key={k.id}
              label={k.label}
              emoji={k.emoji}
              selected={draft.kinds.includes(k.id)}
              onPress={() => setDraft(d => ({ ...d, kinds: toggle(d.kinds, k.id) }))}
              style={styles.gap}
              testID={`filter-kind-${k.id}`}
            />
          ))}
        </View>
        <View style={styles.rule} />

        <SectionLabel>Coming up within</SectionLabel>
        <Text style={[type.small, { marginBottom: spacing.sm }]}>Only show people with a bloop in this window.</Text>
        <StepSlider steps={STEPS} value={draft.withinDays} onChange={v => setDraft(d => ({ ...d, withinDays: v }))} testID="filter-within" />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: spacing.xl, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  searchRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.xl, marginTop: spacing.md, alignItems: 'center' },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    height: 44,
    gap: 8,
  },
  input: { flex: 1, ...type.body, paddingVertical: 0 },
  empty: { alignItems: 'center', paddingTop: 80 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  gap: { marginRight: spacing.sm, marginBottom: spacing.sm },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginVertical: spacing.lg },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
