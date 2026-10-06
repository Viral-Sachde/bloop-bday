import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Linking, ScrollView, StatusBar, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { Icon } from '../components/Icon';
import { TimePickerSheet } from '../components/TimePickerSheet';
import { showToast } from '../components/Toast';
import { Button, Chip, SectionLabel, Tap } from '../components/ui';
import { DEFAULT_RULES, describeRule } from '../lib/reminders';
import { TONES } from '../lib/wishes';
import {
  hasExactAlarmPermission,
  hasNotificationPermission,
  openExactAlarmSettings,
  requestNotificationPermission,
  sendTestBloop,
} from '../services/notifications';
import { hasGalleryPermission, requestGalleryPermission } from '../services/gallery';
import { useStore } from '../store';
import { colors, radius, spacing, type } from '../theme';
import { ReminderRule } from '../types';

function Row({ title, body, right, onPress, testID }: { title: string; body?: string; right?: React.ReactNode; onPress?: () => void; testID?: string }) {
  const content = (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={type.h3}>{title}</Text>
        {body ? <Text style={type.small}>{body}</Text> : null}
      </View>
      {right}
    </View>
  );
  return onPress ? (
    <Tap onPress={onPress} testID={testID} accessibilityLabel={title}>
      {content}
    </Tap>
  ) : (
    content
  );
}

function Status({ ok, label }: { ok: boolean; label: string }) {
  return (
    <View style={[styles.status, { backgroundColor: ok ? colors.lime : colors.dangerSoft }]}>
      <Text style={[type.h3, { fontSize: 12, color: ok ? colors.forest : colors.danger }]}>{label}</Text>
    </View>
  );
}

export function SettingsScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const settings = useStore(s => s.settings);
  const events = useStore(s => s.events);
  const { updateSettings, setDefaultRules, resetAll } = useStore.getState();

  const [notifOk, setNotifOk] = useState(true);
  const [alarmOk, setAlarmOk] = useState(true);
  const [galleryOk, setGalleryOk] = useState(true);
  const [sheet, setSheet] = useState<{ open: boolean; editing?: ReminderRule }>({ open: false });
  const [confirmReset, setConfirmReset] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          setNotifOk(await hasNotificationPermission());
          setAlarmOk(await hasExactAlarmPermission());
          setGalleryOk(await hasGalleryPermission());
        } catch {
          // Status rows simply stay as they were.
        }
      })();
    }, []),
  );

  const saveRule = (rule: ReminderRule) => {
    const base = settings.defaultRules;
    const next = sheet.editing ? base.map(r => (r.id === sheet.editing!.id ? rule : r)) : [...base.filter(r => r.id !== rule.id), rule];
    setDefaultRules(next.sort((a, b) => b.daysBefore - a.daysBefore || a.hour - b.hour || a.minute - b.minute));
    setSheet({ open: false });
  };

  return (
    <View style={styles.root} testID="settings">
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.xl, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <Text style={[type.h1, { color: colors.forest, marginBottom: spacing.xl }]}>Settings</Text>

        <SectionLabel>Reminders</SectionLabel>
        <View style={styles.card}>
          <Row
            title="Midnight pings"
            body="Master switch for every reminder"
            right={
              <Switch
                value={settings.notificationsEnabled}
                onValueChange={async v => {
                  if (v && !(await requestNotificationPermission())) {
                    showToast('Allow notifications in system settings');
                    setNotifOk(false);
                  }
                  updateSettings({ notificationsEnabled: v });
                }}
                trackColor={{ false: colors.line, true: colors.forest }}
                thumbColor={settings.notificationsEnabled ? colors.lime : '#fff'}
                testID="switch-notifications"
              />
            }
          />
        </View>

        <Text style={[type.small, { marginTop: spacing.lg, marginBottom: spacing.sm }]}>Default times for everyone</Text>
        <View style={styles.card} testID="default-rules">
          {settings.defaultRules.length === 0 ? <Text style={[type.small, { padding: spacing.md }]}>No default reminders.</Text> : null}
          {settings.defaultRules.map(r => (
            <Row
              key={r.id}
              title={describeRule(r)}
              onPress={() => setSheet({ open: true, editing: r })}
              testID="default-rule"
              right={
                <Tap onPress={() => setDefaultRules(settings.defaultRules.filter(x => x.id !== r.id))} accessibilityLabel="Remove default reminder" testID="default-rule-remove">
                  <Icon name="x" size={18} color={colors.muted} />
                </Tap>
              }
            />
          ))}
        </View>
        <View style={{ flexDirection: 'row', marginTop: spacing.md }}>
          <Chip label="Add a time" emoji="➕" onPress={() => setSheet({ open: true })} testID="default-rule-add" />
          <Chip label="Reset" onPress={() => setDefaultRules(DEFAULT_RULES)} style={{ marginLeft: spacing.sm }} testID="default-rule-reset" />
        </View>

        <SectionLabel style={{ marginTop: spacing.xxl }}>Permissions</SectionLabel>
        <View style={styles.card}>
          <Row
            title="Notifications"
            right={<Status ok={notifOk} label={notifOk ? 'On' : 'Off'} />}
            onPress={notifOk ? undefined : async () => (await requestNotificationPermission()) ? setNotifOk(true) : Linking.openSettings()}
            body={notifOk ? undefined : 'Tap to turn on'}
            testID="perm-notifications"
          />
          <Row
            title="Exact alarms"
            body={alarmOk ? 'Pings land at the exact minute' : 'Needed for 12:00 AM sharp. Tap to allow'}
            right={<Status ok={alarmOk} label={alarmOk ? 'On' : 'Off'} />}
            onPress={alarmOk ? undefined : () => openExactAlarmSettings()}
            testID="perm-alarms"
          />
          <Row
            title="Photos"
            body={galleryOk ? undefined : 'Tap to allow memories from your gallery'}
            right={<Status ok={galleryOk} label={galleryOk ? 'On' : 'Off'} />}
            onPress={galleryOk ? undefined : async () => setGalleryOk(await requestGalleryPermission())}
            testID="perm-photos"
          />
        </View>

        <SectionLabel style={{ marginTop: spacing.xxl }}>Wishes</SectionLabel>
        <Text style={[type.small, { marginBottom: spacing.sm }]}>Default tone</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {TONES.map(t => (
            <Chip key={t.id} label={t.label} emoji={t.emoji} selected={settings.defaultTone === t.id} onPress={() => updateSettings({ defaultTone: t.id })} style={{ marginRight: spacing.sm }} testID={`default-tone-${t.id}`} />
          ))}
        </ScrollView>

        <SectionLabel style={{ marginTop: spacing.xxl }}>Try it</SectionLabel>
        <Button
          label="Send me a test bloop in 5 seconds"
          icon="bell"
          kind="outline"
          testID="send-test"
          onPress={async () => {
            if (!(await requestNotificationPermission())) {
              showToast('Turn on notifications first');
              return;
            }
            await sendTestBloop(events[0]);
            showToast('Test bloop on its way. Lock your phone!');
          }}
        />

        <SectionLabel style={{ marginTop: spacing.xxl }}>Your data</SectionLabel>
        <View style={styles.card}>
          <Row title="Stays on this phone" body="No account, no uploads. Birthdays, photos and settings are stored locally." />
          <Row title="Erase everything" body={`${events.length} ${events.length === 1 ? 'person' : 'people'} and all settings`} onPress={() => setConfirmReset(true)} testID="erase-all" right={<Icon name="trash" size={18} color={colors.danger} />} />
        </View>

        <Text style={[type.small, { textAlign: 'center', marginTop: spacing.xxl }]}>bloop 1.0 · made for midnight people</Text>
      </ScrollView>

      <TimePickerSheet visible={sheet.open} initial={sheet.editing} onClose={() => setSheet({ open: false })} onSave={saveRule} />

      <ConfirmSheet
        visible={confirmReset}
        title="Erase everything?"
        message="This removes everyone you added and resets your settings."
        bullets={['All reminders are cancelled', 'Pinned photo links are forgotten', 'This cannot be undone']}
        confirmLabel="Yes, erase it all"
        destructive
        onConfirm={() => {
          setConfirmReset(false);
          resetAll();
          showToast('All clear');
          nav.navigate('Tabs', { screen: 'Home' });
        }}
        onCancel={() => setConfirmReset(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  card: { backgroundColor: colors.paper, borderRadius: radius.lg, paddingHorizontal: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.md },
  status: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
});
