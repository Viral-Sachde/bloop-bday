import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { Icon } from '../components/Icon';
import { PhotoPicker } from '../components/PhotoPicker';
import { showToast } from '../components/Toast';
import { TimePickerSheet } from '../components/TimePickerSheet';
import { Avatar, Button, Chip, IconButton, Pill, SectionLabel, Tap } from '../components/ui';
import {
  countdownLabel,
  daysUntil,
  formatFullDate,
  nextOccurrence,
  turningAge,
  zodiac,
} from '../lib/dates';
import { describeRule, eventNoun, possessive, rulesFor } from '../lib/reminders';
import { suggestWishes, TONES, Wish } from '../lib/wishes';
import { RootStackParamList } from '../navigation/types';
import { maybeShowInterstitial, showRewardedVideo } from '../services/ads';
import { ADS_ENABLED } from '../config';
import { findMemoryPhotos, GalleryPhoto, requestGalleryPermission } from '../services/gallery';
import { copyText, sendSms, sendViaWhatsApp, shareText } from '../services/share';
import { useStore } from '../store';
import { colors, radius, shadow, spacing, type } from '../theme';
import { ReminderRule, Tone } from '../types';

export function PersonScreen() {
  const nav = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'Person'>>();
  const insets = useSafeAreaInsets();
  const event = useStore(s => s.events.find(e => e.id === route.params.id));
  const settings = useStore(s => s.settings);
  const { updateEvent, removeEvent, addPhotos, removePhoto, updateSettings } = useStore.getState();

  const [tone, setTone] = useState<Tone>(settings.defaultTone);
  const [timeSheet, setTimeSheet] = useState<{ open: boolean; editing?: ReminderRule }>({ open: false });
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [picker, setPicker] = useState(false);
  const [viewer, setViewer] = useState<string | null>(null);
  const [memories, setMemories] = useState<GalleryPhoto[] | null>(null);
  const [memoriesLoading, setMemoriesLoading] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const wishesY = useRef(0);

  useEffect(() => {
    if (route.params.openWishes) {
      const t = setTimeout(() => scroll.current?.scrollTo({ y: Math.max(0, wishesY.current - 12), animated: true }), 350);
      return () => clearTimeout(t);
    }
  }, [route.params.openWishes]);

  const now = useMemo(() => new Date(), []);
  const occ = event ? nextOccurrence(event.month, event.day, now) : now;
  const age = event?.kind === 'birthday' ? turningAge(event.year, occ) : undefined;
  const days = event ? daysUntil(event.month, event.day, now) : 0;
  const premiumOpen = !ADS_ENABLED || settings.premiumWishesUntil > Date.now();
  const wishes = useMemo(() => (event ? suggestWishes(event, tone, age) : []), [event, tone, age]);

  const loadMemories = useCallback(async () => {
    if (!event) return;
    setMemoriesLoading(true);
    try {
      const ok = await requestGalleryPermission();
      if (!ok) {
        showToast('Allow gallery access to see past birthday photos');
        return;
      }
      setMemories(await findMemoryPhotos(event.month, event.day));
    } finally {
      setMemoriesLoading(false);
    }
  }, [event]);

  if (!event) {
    return (
      <View style={styles.missing}>
        <Text style={type.h2}>This person was removed.</Text>
        <Button label="Back" onPress={() => nav.goBack()} style={{ marginTop: spacing.lg }} />
      </View>
    );
  }

  const unlock = async () => {
    if (unlocking) return;
    setUnlocking(true);
    const earned = await showRewardedVideo();
    setUnlocking(false);
    if (earned) {
      updateSettings({ premiumWishesUntil: Date.now() + 24 * 3600 * 1000 });
      showToast('Premium wishes unlocked for 24 hours 🎉');
    } else {
      showToast('No video was available. Try again in a moment.');
    }
  };

  const customRules = event.reminders;
  const rules = rulesFor(event, settings.defaultRules);

  const saveRule = (rule: ReminderRule) => {
    const base = customRules ?? [...settings.defaultRules];
    const next = timeSheet.editing ? base.map(r => (r.id === timeSheet.editing!.id ? rule : r)) : [...base.filter(r => r.id !== rule.id), rule];
    updateEvent(event.id, { reminders: next.sort((a, b) => b.daysBefore - a.daysBefore || a.hour - b.hour || a.minute - b.minute) });
    setTimeSheet({ open: false });
  };

  const onRemoveConfirmed = () => {
    setConfirmRemove(false);
    removeEvent(event.id);
    nav.goBack();
    showToast(`${event.name} removed`);
  };

  const wishActions = (w: Wish) => (
    <View style={styles.wishActions}>
      <Tap style={styles.act} onPress={() => { copyText(w.text); showToast('Copied'); }} testID="wish-copy" accessibilityLabel="Copy wish">
        <Icon name="copy" size={16} color={colors.forest} />
        <Text style={styles.actText}>Copy</Text>
      </Tap>
      <Tap
        style={styles.act}
        onPress={async () => {
          const via = await sendViaWhatsApp(w.text, event.phone);
          if (via === 'share') showToast('WhatsApp not found, opened share');
          maybeShowInterstitial();
        }}
        testID="wish-whatsapp"
        accessibilityLabel="Send on WhatsApp">
        <Icon name="message" size={16} color={colors.forest} />
        <Text style={styles.actText}>WhatsApp</Text>
      </Tap>
      {event.phone ? (
        <Tap style={styles.act} onPress={() => sendSms(w.text, event.phone!).catch(() => showToast('Could not open Messages'))} testID="wish-sms" accessibilityLabel="Send SMS">
          <Icon name="message" size={16} color={colors.forest} />
          <Text style={styles.actText}>SMS</Text>
        </Tap>
      ) : null}
      <Tap style={styles.act} onPress={() => shareText(w.text)} testID="wish-share" accessibilityLabel="Share wish">
        <Icon name="share" size={16} color={colors.forest} />
        <Text style={styles.actText}>Share</Text>
      </Tap>
    </View>
  );

  return (
    <View style={styles.root} testID="person">
      <StatusBar barStyle="light-content" />
      <ScrollView ref={scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <View style={[styles.hero, { paddingTop: insets.top + spacing.md }]}>
          <View style={styles.heroBar}>
            <IconButton name="chevron-left" label="Back" onPress={() => nav.goBack()} bg="rgba(255,255,255,0.14)" color={colors.lime} testID="person-back" />
            <IconButton name="edit" label="Edit" onPress={() => nav.navigate('Editor', { id: event.id })} bg="rgba(255,255,255,0.14)" color={colors.lime} testID="person-edit" />
          </View>
          <View style={{ alignItems: 'center' }}>
            <Avatar name={event.name} size={92} />
            <Text style={styles.name}>{event.name}</Text>
            <Text style={styles.sub}>
              {possessive(event.name.split(' ')[0])} {eventNoun(event)} · {formatFullDate(event.month, event.day, event.kind === 'birthday' ? event.year : undefined)}
            </Text>
            <View style={styles.heroPills}>
              <Pill label={days === 0 ? 'Today! 🎉' : `In ${countdownLabel(days)}`} tone="lime" />
              {age ? <Pill label={`Turning ${age}`} tone="butter" /> : null}
              {event.kind === 'birthday' ? <Pill label={zodiac(event.month, event.day)} tone="plain" /> : null}
            </View>
          </View>
        </View>

        <View style={styles.body}>
          {/* Reminders */}
          <View style={[styles.card, shadow]} testID="reminders-card">
            <View style={styles.cardHead}>
              <SectionLabel style={{ marginBottom: 0 }}>Reminders</SectionLabel>
              <Text style={[type.small, { color: colors.forest }]}>{customRules ? 'Custom' : 'Your defaults'}</Text>
            </View>
            {rules.length === 0 ? <Text style={[type.small, { marginTop: spacing.md }]}>No reminders. You will not be notified.</Text> : null}
            {rules.map(r => (
              <View key={r.id} style={styles.ruleRow}>
                <Icon name="clock" size={18} color={colors.forest} />
                <Text style={[type.body, { flex: 1, marginLeft: spacing.md }]}>{describeRule(r)}</Text>
                {customRules ? (
                  <Pressable hitSlop={10} onPress={() => updateEvent(event.id, { reminders: customRules.filter(x => x.id !== r.id) })} accessibilityLabel="Remove reminder" testID="rule-remove">
                    <Icon name="x" size={18} color={colors.muted} />
                  </Pressable>
                ) : null}
              </View>
            ))}
            <View style={styles.ruleBtns}>
              <Chip label="Add a time" emoji="➕" onPress={() => setTimeSheet({ open: true })} testID="rule-add" />
              {customRules ? (
                <Chip label="Use defaults" onPress={() => updateEvent(event.id, { reminders: undefined })} testID="rule-reset" style={{ marginLeft: spacing.sm }} />
              ) : null}
            </View>
          </View>

          {/* Wishes */}
          <View onLayout={e => (wishesY.current = e.nativeEvent.layout.y)} style={{ marginTop: spacing.xl }}>
            <Text style={[type.h2, { marginBottom: spacing.md }]}>Wishes</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              {TONES.map(t => (
                <Chip key={t.id} label={t.label} emoji={t.emoji} selected={tone === t.id} onPress={() => setTone(t.id)} style={{ marginRight: spacing.sm }} testID={`tone-${t.id}`} />
              ))}
            </ScrollView>
            {wishes.map(w => {
              const locked = w.premium && !premiumOpen;
              return (
                <View key={w.id} style={[styles.wish, w.premium && { backgroundColor: colors.mint }]} testID={locked ? 'wish-locked' : 'wish'}>
                  {w.premium ? (
                    <View style={styles.premTag}>
                      <Icon name={locked ? 'lock' : 'star'} size={12} color={colors.forest} />
                      <Text style={styles.premText}>{locked ? 'Premium' : ADS_ENABLED ? 'Premium · unlocked' : 'Premium'}</Text>
                    </View>
                  ) : null}
                  {locked ? (
                    <>
                      <Text style={[type.body, { color: colors.muted }]} numberOfLines={2}>
                        {w.text.slice(0, 38)}…
                      </Text>
                      <View style={{ marginTop: spacing.md }}>
                        <Button label={unlocking ? 'Loading video…' : 'Watch a short video to unlock'} icon="play" kind="primary" onPress={unlock} disabled={unlocking} testID="unlock-wishes" />
                      </View>
                    </>
                  ) : (
                    <>
                      <Text style={type.body} testID="wish-text">{w.text}</Text>
                      {wishActions(w)}
                    </>
                  )}
                </View>
              );
            })}
          </View>

          {/* Memories */}
          <View style={{ marginTop: spacing.xl }}>
            <View style={styles.cardHead}>
              <Text style={type.h2}>Memories</Text>
              <Chip label="Add photos" emoji="🖼️" onPress={() => setPicker(true)} testID="memories-add" />
            </View>

            <Text style={[type.small, { marginTop: spacing.sm, marginBottom: spacing.md }]}>
              Photos you pin here are ready to share on the day.
            </Text>
            {event.photos.length > 0 ? (
              <View style={styles.grid} testID="saved-photos">
                {event.photos.map(uri => (
                  <Pressable key={uri} onPress={() => setViewer(uri)} accessibilityLabel="Open photo">
                    <Image source={{ uri }} style={styles.thumb} />
                  </Pressable>
                ))}
              </View>
            ) : (
              <View style={styles.noPhotos}>
                <Icon name="image" size={26} color={colors.muted} />
                <Text style={[type.small, { marginTop: 6 }]}>No saved photos yet</Text>
              </View>
            )}

            <View style={[styles.card, { marginTop: spacing.lg }]}>
              <Text style={type.h3}>From past birthdays</Text>
              <Text style={[type.small, { marginTop: 2 }]}>
                Photos taken on {event.day}/{event.month} in earlier years. Often the ones with them in.
              </Text>
              {memories === null ? (
                <View style={{ marginTop: spacing.md }}>
                  <Button label={memoriesLoading ? 'Looking…' : 'Look through my gallery'} kind="outline" icon="image" onPress={loadMemories} disabled={memoriesLoading} testID="memories-find" />
                </View>
              ) : memories.length === 0 ? (
                <Text style={[type.small, { marginTop: spacing.md }]} testID="memories-none">Nothing found for this date yet.</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.md }} testID="memories-found">
                  {memories.map(m => {
                    const saved = event.photos.includes(m.uri);
                    return (
                      <Pressable
                        key={m.uri}
                        onPress={() => {
                          if (saved) removePhoto(event.id, m.uri);
                          else addPhotos(event.id, [m.uri]);
                        }}
                        style={{ marginRight: spacing.sm }}
                        accessibilityLabel={saved ? 'Remove from saved' : 'Save photo'}>
                        <Image source={{ uri: m.uri }} style={styles.memThumb} />
                        <View style={[styles.memBadge, saved && { backgroundColor: colors.lime }]}>
                          <Icon name={saved ? 'check' : 'plus'} size={14} color={colors.forest} strokeWidth={3} />
                        </View>
                        <Text style={[type.small, { textAlign: 'center' }]}>{new Date(m.takenAt).getFullYear()}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          </View>

          <View style={{ marginTop: spacing.xxl }}>
            <Button label="Remove from Bloop" kind="ghost" icon="trash" onPress={() => setConfirmRemove(true)} testID="person-remove" />
          </View>
        </View>
      </ScrollView>

      <TimePickerSheet visible={timeSheet.open} initial={timeSheet.editing} onClose={() => setTimeSheet({ open: false })} onSave={saveRule} />

      <ConfirmSheet
        visible={confirmRemove}
        title={`Remove ${event.name}?`}
        message="If you remove them today, Bloop stops reminding you."
        bullets={['Their reminders are cancelled', 'Saved photo links are forgotten (your gallery is untouched)', 'You can always add them back']}
        confirmLabel="Yes, remove"
        destructive
        onConfirm={onRemoveConfirmed}
        onCancel={() => setConfirmRemove(false)}
      />

      <PhotoPicker
        visible={picker}
        onClose={() => setPicker(false)}
        onDone={uris => {
          addPhotos(event.id, uris);
          setPicker(false);
          showToast(`${uris.length} photo${uris.length > 1 ? 's' : ''} added`);
        }}
      />

      <Modal visible={viewer !== null} transparent animationType="fade" onRequestClose={() => setViewer(null)} statusBarTranslucent>
        <View style={styles.viewer}>
          {viewer ? <Image source={{ uri: viewer }} style={styles.viewerImg} resizeMode="contain" /> : null}
          <View style={[styles.viewerBar, { paddingBottom: insets.bottom + spacing.md }]}>
            <IconButton name="x" label="Close photo" onPress={() => setViewer(null)} bg="rgba(255,255,255,0.18)" color="#fff" />
            <IconButton
              name="trash"
              label="Unpin photo"
              onPress={() => {
                if (viewer) removePhoto(event.id, viewer);
                setViewer(null);
              }}
              bg="rgba(255,255,255,0.18)"
              color="#fff"
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const THUMB = 92;
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream, padding: spacing.xl },
  hero: { backgroundColor: colors.forest, paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl },
  heroBar: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  name: { fontFamily: type.h1.fontFamily, fontSize: 38, color: '#fff', marginTop: spacing.md, textAlign: 'center' },
  sub: { ...type.body, color: colors.sage, marginTop: 2, textAlign: 'center' },
  heroPills: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: spacing.md },
  body: { padding: spacing.xl },
  card: { backgroundColor: colors.paper, borderRadius: radius.lg, padding: spacing.lg },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ruleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  ruleBtns: { flexDirection: 'row', marginTop: spacing.md },
  wish: { backgroundColor: colors.paper, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.sm },
  wishActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  act: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.cream, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
  actText: { ...type.h3, fontSize: 13, color: colors.forest },
  premTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  premText: { ...type.label, color: colors.forest, letterSpacing: 0.8, fontSize: 11 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  thumb: { width: THUMB, height: THUMB, borderRadius: radius.md, backgroundColor: colors.creamDeep },
  noPhotos: { alignItems: 'center', justifyContent: 'center', height: 96, borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.line },
  memThumb: { width: 110, height: 110, borderRadius: radius.md, backgroundColor: colors.creamDeep },
  memBadge: { position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  viewer: { flex: 1, backgroundColor: 'rgba(5,15,8,0.96)', justifyContent: 'center' },
  viewerImg: { width: '100%', height: '80%' },
  viewerBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.xl },
});
