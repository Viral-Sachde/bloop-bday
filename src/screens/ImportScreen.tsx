import { useNavigation } from '@react-navigation/native';
import { errorCodes, isErrorWithCode, pick, types } from '@react-native-documents/picker';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet } from '../components/BottomSheet';
import { Icon, IconName } from '../components/Icon';
import { showToast } from '../components/Toast';
import { Avatar, Button, IconButton, Tap } from '../components/ui';
import { formatMonthDay } from '../lib/dates';
import { dedupeKey, parseBulk, parseICS, parseVCard, ParsedPerson } from '../lib/importers';
import { loadContactBirthdays, requestContactsPermission } from '../services/contacts';
import { maybeShowInterstitial } from '../services/ads';
import { useStore } from '../store';
import { colors, radius, spacing, type } from '../theme';
import { Source } from '../types';

interface Candidate extends ParsedPerson {
  key: string;
  contactId?: string;
}

function Tile({ icon, title, body, onPress, id, disabled }: { icon: IconName; title: string; body: string; onPress: () => void; id: string; disabled?: boolean }) {
  return (
    <Tap onPress={onPress} style={styles.tile} testID={id} disabled={disabled} accessibilityLabel={title}>
      <View style={styles.tileIcon}>
        <Icon name={icon} size={22} color={colors.forest} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={type.h3}>{title}</Text>
        <Text style={type.small}>{body}</Text>
      </View>
      <Icon name="chevron-right" size={18} color={colors.muted} />
    </Tap>
  );
}

export function ImportScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const events = useStore(s => s.events);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [source, setSource] = useState<Source>('contacts');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [socialOpen, setSocialOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');

  const existing = useMemo(() => new Set(events.map(e => dedupeKey(e.name, e.month, e.day))), [events]);

  const present = (list: ParsedPerson[], src: Source, ids?: Map<string, string>) => {
    const seen = new Set<string>();
    const c: Candidate[] = [];
    list.forEach((p, i) => {
      const d = dedupeKey(p.name, p.month, p.day);
      if (seen.has(d)) return;
      seen.add(d);
      c.push({ ...p, key: `${i}-${d}`, contactId: ids?.get(d) });
    });
    setSource(src);
    setCandidates(c);
    setSelected(new Set(c.filter(x => !existing.has(dedupeKey(x.name, x.month, x.day))).map(x => x.key)));
  };

  const fromContacts = async () => {
    setBusy(true);
    try {
      if (!(await requestContactsPermission())) {
        showToast('Contacts access is off. Enable it in Settings to import.');
        return;
      }
      const list = await loadContactBirthdays();
      if (!list.length) {
        showToast('No contacts with birthdays found on this phone');
        return;
      }
      const ids = new Map(list.map(l => [dedupeKey(l.name, l.month, l.day), l.contactId]));
      present(list, 'contacts', ids);
    } catch {
      showToast('Could not read contacts');
    } finally {
      setBusy(false);
    }
  };

  const fromFile = async () => {
    setBusy(true);
    try {
      const [file] = await pick({ type: [types.allFiles] });
      const text = await (await fetch(file.uri)).text();
      const lower = (file.name ?? '').toLowerCase();
      const list = lower.endsWith('.ics') || text.includes('BEGIN:VCALENDAR') ? parseICS(text) : parseVCard(text);
      if (!list.length) {
        showToast('No birthdays found in that file');
        return;
      }
      present(list, 'file');
    } catch (e) {
      if (!(isErrorWithCode(e) && e.code === errorCodes.OPERATION_CANCELED)) showToast('Could not read that file');
    } finally {
      setBusy(false);
    }
  };

  const fromPaste = () => {
    const list = parseBulk(pasteText);
    if (!list.length) {
      showToast('Nothing recognised. Try: Aman 12 Oct');
      return;
    }
    setPasteOpen(false);
    present(list, 'paste');
  };

  const doImport = () => {
    if (!candidates) return;
    const chosen = candidates.filter(c => selected.has(c.key));
    const added = useStore.getState().addMany(
      chosen.map(c => ({
        name: c.name,
        kind: 'birthday' as const,
        month: c.month,
        day: c.day,
        year: c.year,
        phone: c.phone,
        contactId: c.contactId,
        relation: 'friend' as const,
        source,
      })),
    );
    showToast(added ? `${added} ${added === 1 ? 'person' : 'people'} added 🎉` : 'Everyone was already in Bloop');
    nav.goBack();
    if (added) setTimeout(() => maybeShowInterstitial(), 600);
  };

  const toggle = (key: string) =>
    setSelected(s => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });

  return (
    <View style={styles.root} testID="import">
      <StatusBar barStyle="dark-content" />
      <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]}>
        <IconButton
          name={candidates ? 'chevron-left' : 'x'}
          label="Back"
          onPress={() => (candidates ? setCandidates(null) : nav.goBack())}
          bg={colors.creamDeep}
          testID="import-back"
        />
        <Text style={type.label}>{candidates ? 'REVIEW' : 'IMPORT'}</Text>
        <View style={{ width: 44 }} />
      </View>

      {!candidates ? (
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={[type.h1, { color: colors.forest }]}>Bring your circle in</Text>
          <Text style={[type.body, { color: colors.muted, marginTop: spacing.sm, marginBottom: spacing.xl }]}>
            Birthdays are read on your phone and stay on your phone.
          </Text>
          <Tile disabled={busy} id="import-contacts" icon="users" title="Phone contacts" body="Everyone with a birthday saved (Google, WhatsApp, iCloud)" onPress={fromContacts} />
          <Tile disabled={busy} id="import-file" icon="calendar" title="A calendar or contacts file" body=".ics or .vcf, e.g. a Google Calendar export" onPress={fromFile} />
          <Tile disabled={busy} id="import-paste" icon="edit" title="Paste a list" body="Aman 12 Oct, Riya 3/7, Neha March 9" onPress={() => setPasteOpen(true)} />
          <Tile disabled={busy} id="import-social" icon="message" title="Facebook · Instagram · Snapchat" body="How to get those birthdays into Bloop" onPress={() => setSocialOpen(true)} />
        </ScrollView>
      ) : (
        <>
          <View style={styles.reviewHead}>
            <Text style={type.h2}>{candidates.length} found</Text>
            <Pressable
              onPress={() =>
                setSelected(s =>
                  s.size === candidates.length ? new Set() : new Set(candidates.map(c => c.key)),
                )
              }
              accessibilityRole="button"
              testID="import-toggle-all">
              <Text style={[type.h3, { color: colors.forest }]}>{selected.size === candidates.length ? 'Select none' : 'Select all'}</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: 24 }}>
            {candidates.map(c => {
              const on = selected.has(c.key);
              const dup = existing.has(dedupeKey(c.name, c.month, c.day));
              return (
                <Tap key={c.key} onPress={() => toggle(c.key)} style={styles.candidate} testID={`candidate-${c.name}`} accessibilityLabel={`${c.name}, ${on ? 'selected' : 'not selected'}`}>
                  <Avatar name={c.name} size={44} />
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={type.h3}>{c.name}</Text>
                    <Text style={type.small}>
                      {formatMonthDay(c.month, c.day)}
                      {c.year ? ` ${c.year}` : ''}
                      {dup ? ' · already in Bloop' : ''}
                    </Text>
                  </View>
                  <View style={[styles.check, on && styles.checkOn]}>{on ? <Icon name="check" size={14} color={colors.lime} strokeWidth={3} /> : null}</View>
                </Tap>
              );
            })}
          </ScrollView>
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
            <Button
              label={selected.size ? `Add ${selected.size} ${selected.size === 1 ? 'person' : 'people'}` : 'Pick who to add'}
              onPress={doImport}
              disabled={!selected.size}
              testID="import-confirm"
            />
          </View>
        </>
      )}

      <BottomSheet
        visible={pasteOpen}
        onClose={() => setPasteOpen(false)}
        title="PASTE A LIST"
        testID="paste-sheet"
        footer={<Button label="Find birthdays" onPress={fromPaste} testID="paste-go" />}>
        <Text style={[type.small, { marginBottom: spacing.md }]}>
          One person per line. Dates like 12 Oct, Oct 12, 12/10 or 2001-04-30 all work.
        </Text>
        <TextInput
          value={pasteText}
          onChangeText={setPasteText}
          placeholder={'Aman 12 Oct\nRiya - 3/7\nNeha, March 9 1998'}
          placeholderTextColor={colors.muted}
          multiline
          style={styles.paste}
          testID="paste-input"
          textAlignVertical="top"
        />
      </BottomSheet>

      <BottomSheet
        visible={socialOpen}
        onClose={() => setSocialOpen(false)}
        title="SOCIAL APPS"
        testID="social-sheet"
        footer={<Button label="Got it" onPress={() => setSocialOpen(false)} />}>
        <Text style={[type.h2, { marginBottom: spacing.sm }]}>The honest bit</Text>
        <Text style={[type.body, { color: colors.muted }]}>
          Facebook, Instagram and Snapchat don't let other apps read your friends' birthdays. That's their rule, and no app can get around it.
        </Text>
        <Text style={[type.h3, { marginTop: spacing.lg, marginBottom: spacing.sm }]}>What works</Text>
        {[
          'Contacts: if a friend\'s birthday is in your phone\'s contacts, Bloop picks it up.',
          'Paste a list: spot a birthday on Facebook, Instagram or Snapchat? Type "Name 12 Oct" and paste a whole list at once.',
          'Calendar files: export birthdays from Google Calendar (.ics) and import the file.',
        ].map(t => (
          <View key={t} style={{ flexDirection: 'row', marginBottom: spacing.sm }}>
            <Text style={[type.body, { width: 18, color: colors.forest }]}>•</Text>
            <Text style={[type.body, { flex: 1 }]}>{t}</Text>
          </View>
        ))}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg },
  body: { padding: spacing.xl },
  tile: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.paper, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, gap: spacing.md },
  tileIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' },
  reviewHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.lg },
  candidate: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.paper, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.forest, borderColor: colors.forest },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, backgroundColor: colors.cream },
  paste: { ...type.body, backgroundColor: colors.cream, borderRadius: radius.md, padding: spacing.lg, minHeight: 150, borderWidth: 1.5, borderColor: colors.line },
});
