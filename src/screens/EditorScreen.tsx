import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DateWheels } from '../components/DateWheels';
import { Icon } from '../components/Icon';
import { showToast } from '../components/Toast';
import { Button, Chip, IconButton, SectionLabel } from '../components/ui';
import { formatFullDate, isValidDate } from '../lib/dates';
import { RELATIONS } from '../lib/filters';
import { RootStackParamList } from '../navigation/types';
import { maybeShowInterstitial } from '../services/ads';
import { useStore } from '../store';
import { colors, radius, spacing, type } from '../theme';
import { EventKind, Relation } from '../types';

const KIND_OPTIONS: Array<{ id: EventKind; label: string; emoji: string }> = [
  { id: 'birthday', label: 'Birthday', emoji: '🎂' },
  { id: 'anniversary', label: 'Anniversary', emoji: '💐' },
  { id: 'custom', label: 'Something else', emoji: '🎈' },
];

export function EditorScreen() {
  const nav = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'Editor'>>();
  const insets = useSafeAreaInsets();
  const editingId = route.params?.id;
  const existing = useStore(s => s.events.find(e => e.id === editingId));
  const { addEvent, updateEvent } = useStore.getState();

  const today = new Date();
  const [name, setName] = useState(existing?.name ?? route.params?.prefill?.name ?? '');
  const [kind, setKind] = useState<EventKind>(existing?.kind ?? 'birthday');
  const [title, setTitle] = useState(existing?.title ?? '');
  const [date, setDate] = useState<{ month: number; day: number; year?: number }>({
    month: existing?.month ?? today.getMonth() + 1,
    day: existing?.day ?? today.getDate(),
    year: existing?.year,
  });
  const [relation, setRelation] = useState<Relation>(existing?.relation ?? 'friend');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [error, setError] = useState('');

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return setError('Add a name first');
    if (kind === 'custom' && !title.trim()) return setError('Name the occasion, e.g. Graduation');
    if (!isValidDate(date.month, date.day, date.year)) return setError('That date does not exist');
    const payload = {
      name: trimmed,
      kind,
      title: kind === 'custom' ? title.trim() : undefined,
      month: date.month,
      day: date.day,
      year: date.year,
      relation,
      phone: phone.trim() || undefined,
    };
    if (existing) {
      updateEvent(existing.id, payload);
      showToast('Saved');
    } else {
      addEvent({ ...payload, source: 'manual' });
      showToast(`${trimmed} added. Midnight ping is set 🎉`);
    }
    nav.goBack();
    // A natural pause: after a successful add.
    if (!existing) setTimeout(() => maybeShowInterstitial(), 600);
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined} testID="editor">
      <StatusBar barStyle="dark-content" />
      <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]}>
        <IconButton name="x" label="Close" onPress={() => nav.goBack()} bg={colors.creamDeep} testID="editor-close" />
        <Text style={type.label}>{existing ? 'EDIT' : 'ADD SOMEONE'}</Text>
        <View style={{ width: 44 }} />
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={[type.h1, { color: colors.forest, marginBottom: spacing.lg }]}>
          {existing ? 'Update the details' : 'Who is it?'}
        </Text>

        <SectionLabel>Name</SectionLabel>
        <TextInput
          value={name}
          onChangeText={t => {
            setName(t);
            setError('');
          }}
          placeholder="e.g. Aman Gupta"
          placeholderTextColor={colors.muted}
          style={styles.input}
          testID="editor-name"
          autoCapitalize="words"
          returnKeyType="done"
        />

        <SectionLabel style={{ marginTop: spacing.xl }}>Occasion</SectionLabel>
        <View style={styles.wrap}>
          {KIND_OPTIONS.map(k => (
            <Chip key={k.id} label={k.label} emoji={k.emoji} selected={kind === k.id} onPress={() => setKind(k.id)} style={styles.gap} testID={`kind-${k.id}`} />
          ))}
        </View>
        {kind === 'custom' ? (
          <TextInput
            value={title}
            onChangeText={t => {
              setTitle(t);
              setError('');
            }}
            placeholder="What's the occasion?"
            placeholderTextColor={colors.muted}
            style={[styles.input, { marginTop: spacing.sm }]}
            testID="editor-title"
          />
        ) : null}

        <SectionLabel style={{ marginTop: spacing.xl }}>Date</SectionLabel>
        <View style={styles.dateCard}>
          <Text style={[type.h2, { textAlign: 'center', color: colors.forest, marginBottom: spacing.sm }]} testID="editor-date-label">
            {formatFullDate(date.month, date.day, date.year)}
          </Text>
          <DateWheels month={date.month} day={date.day} year={date.year} onChange={setDate} />
        </View>

        <SectionLabel style={{ marginTop: spacing.xl }}>Who are they to you?</SectionLabel>
        <View style={styles.wrap}>
          {RELATIONS.map(r => (
            <Chip key={r.id} label={r.label} emoji={r.emoji} selected={relation === r.id} onPress={() => setRelation(r.id)} style={styles.gap} testID={`rel-${r.id}`} />
          ))}
        </View>

        <SectionLabel style={{ marginTop: spacing.xl }}>Phone (optional)</SectionLabel>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="So WhatsApp opens their chat directly"
          placeholderTextColor={colors.muted}
          style={styles.input}
          keyboardType="phone-pad"
          testID="editor-phone"
        />

        <View style={styles.hint}>
          <Icon name="bell" size={16} color={colors.forest} />
          <Text style={[type.small, { flex: 1, marginLeft: spacing.sm, color: colors.forest }]}>
            You'll get your default reminders. Change them per person later.
          </Text>
        </View>

      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        {error ? (
          <Text style={[type.h3, styles.error]} testID="editor-error" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        <Button label={existing ? 'Save changes' : 'Add to Bloop'} onPress={save} testID="editor-save" />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg },
  body: { padding: spacing.xl, paddingBottom: 40 },
  input: {
    ...type.body,
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: 54,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  gap: { marginRight: spacing.sm, marginBottom: spacing.sm },
  dateCard: { backgroundColor: colors.paper, borderRadius: radius.lg, padding: spacing.lg },
  error: { color: colors.danger, textAlign: 'center', marginBottom: spacing.sm },
  hint: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.mint, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.xl },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, backgroundColor: colors.cream, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
});
