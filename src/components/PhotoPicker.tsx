import { Image } from 'react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GalleryPhoto, loadGalleryPage, requestGalleryPermission } from '../services/gallery';
import { colors, fillAbs, spacing, type } from '../theme';
import { Icon } from './Icon';
import { Button, IconButton } from './ui';

const COLS = 3;
const SIZE = Dimensions.get('window').width / COLS;

interface Props {
  visible: boolean;
  onClose: () => void;
  onDone: (uris: string[]) => void;
  title?: string;
}

/** In-app gallery grid. Reads straight from the camera roll so saved URIs stay valid. */
export function PhotoPicker({ visible, onClose, onDone, title = 'Add photos' }: Props) {
  const insets = useSafeAreaInsets();
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [denied, setDenied] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const loadMore = useCallback(
    async (reset = false) => {
      if (loading) return;
      setLoading(true);
      try {
        const ok = await requestGalleryPermission();
        if (!ok) {
          setDenied(true);
          return;
        }
        setDenied(false);
        const page = await loadGalleryPage(reset ? undefined : cursor);
        setPhotos(prev => (reset ? page.photos : [...prev, ...page.photos]));
        setCursor(page.cursor);
        setHasMore(page.hasMore);
      } catch {
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [cursor, loading],
  );

  useEffect(() => {
    if (visible) {
      setSelected([]);
      setPhotos([]);
      setCursor(undefined);
      setHasMore(true);
      loadMore(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const toggle = (uri: string) =>
    setSelected(s => (s.includes(uri) ? s.filter(u => u !== uri) : [...s, uri]));

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.root, { paddingTop: insets.top }]} testID="photo-picker">
        <View style={styles.header}>
          <IconButton name="x" label="Close gallery" onPress={onClose} bg={colors.creamDeep} />
          <Text style={type.h2}>{title}</Text>
          <View style={{ width: 44 }} />
        </View>
        {denied ? (
          <View style={styles.center}>
            <Icon name="lock" size={36} color={colors.forest} />
            <Text style={[type.h2, { marginTop: spacing.md }]}>Gallery access is off</Text>
            <Text style={[type.small, { textAlign: 'center', marginVertical: spacing.md }]}>
              Allow photo access so Bloop can show your pictures. Nothing leaves your phone.
            </Text>
            <Button label="Try again" onPress={() => loadMore(true)} />
          </View>
        ) : (
          <FlatList
            data={photos}
            numColumns={COLS}
            keyExtractor={p => p.uri}
            onEndReachedThreshold={0.6}
            onEndReached={() => hasMore && loadMore(false)}
            ListFooterComponent={loading ? <ActivityIndicator color={colors.forest} style={{ margin: 24 }} /> : undefined}
            ListEmptyComponent={
              !loading ? (
                <View style={styles.center}>
                  <Text style={type.small}>No photos found.</Text>
                </View>
              ) : undefined
            }
            renderItem={({ item }) => {
              const on = selected.includes(item.uri);
              return (
                <Pressable onPress={() => toggle(item.uri)} accessibilityLabel="Photo" testID="gallery-photo">
                  <Image source={{ uri: item.uri }} style={{ width: SIZE, height: SIZE }} />
                  {on ? (
                    <View style={styles.selectedOverlay}>
                      <View style={styles.tick}>
                        <Icon name="check" size={16} color={colors.forest} strokeWidth={3} />
                      </View>
                    </View>
                  ) : null}
                </Pressable>
              );
            }}
          />
        )}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          <Button
            label={selected.length ? `Add ${selected.length} photo${selected.length > 1 ? 's' : ''}` : 'Select photos'}
            disabled={!selected.length}
            testID="photo-picker-done"
            onPress={() => onDone(selected)}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  footer: { padding: spacing.lg, backgroundColor: colors.cream, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  selectedOverlay: {
    ...fillAbs,
    backgroundColor: 'rgba(30,77,43,0.45)',
    borderWidth: 3,
    borderColor: colors.lime,
    alignItems: 'flex-end',
    padding: 8,
  },
  tick: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
});
