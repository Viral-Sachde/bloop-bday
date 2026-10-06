import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { PermissionsAndroid, Platform } from 'react-native';

export interface GalleryPhoto {
  uri: string;
  takenAt: number; // epoch ms
}

export async function requestGalleryPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true; // iOS prompts on first read
  const sdk = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);
  const perm =
    sdk >= 33
      ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
      : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
  const res = await PermissionsAndroid.request(perm, {
    title: 'Find birthday memories',
    message: 'Bloop looks through your gallery on this phone to surface photos from past birthdays.',
    buttonPositive: 'Allow',
    buttonNegative: 'Not now',
  });
  return res === PermissionsAndroid.RESULTS.GRANTED;
}

export async function hasGalleryPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const sdk = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);
  return PermissionsAndroid.check(
    sdk >= 33
      ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
      : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
  );
}

/** [from, to) epoch ms covering one local calendar day. */
export function dayWindow(year: number, month: number, day: number): { from: number; to: number } {
  return {
    from: new Date(year, month - 1, day, 0, 0, 0, 0).getTime(),
    to: new Date(year, month - 1, day + 1, 0, 0, 0, 0).getTime(),
  };
}

/**
 * Photos taken on this month/day in each of the past `years` years. Past
 * birthdays are when the "together" photos usually are.
 */
export async function findMemoryPhotos(
  month: number,
  day: number,
  years = 10,
  perYear = 8,
  now: Date = new Date(),
): Promise<GalleryPhoto[]> {
  const out: GalleryPhoto[] = [];
  for (let i = 0; i <= years; i++) {
    const y = now.getFullYear() - i;
    // Feb 29 birthdays: use Feb 28 in non-leap years so the search still finds something.
    const d = month === 2 && day === 29 && new Date(y, 1, 29).getMonth() !== 1 ? 28 : day;
    const { from, to } = dayWindow(y, month, d);
    if (from > now.getTime()) continue;
    try {
      const page = await CameraRoll.getPhotos({
        first: perYear,
        assetType: 'Photos',
        fromTime: from,
        toTime: to - 1,
        include: ['imageSize'],
      });
      for (const edge of page.edges) {
        out.push({ uri: edge.node.image.uri, takenAt: edge.node.timestamp * 1000 });
      }
    } catch {
      // A failed year should not blank the rest.
    }
  }
  return out.sort((a, b) => b.takenAt - a.takenAt);
}

export interface GalleryPage {
  photos: GalleryPhoto[];
  cursor?: string;
  hasMore: boolean;
}

export async function loadGalleryPage(after?: string, first = 60): Promise<GalleryPage> {
  const page = await CameraRoll.getPhotos({ first, after, assetType: 'Photos' });
  return {
    photos: page.edges.map(e => ({ uri: e.node.image.uri, takenAt: e.node.timestamp * 1000 })),
    cursor: page.page_info.end_cursor,
    hasMore: page.page_info.has_next_page,
  };
}
