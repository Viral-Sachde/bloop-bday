import { PermissionsAndroid, Platform } from 'react-native';
import Contacts from 'react-native-contacts';
import { isValidDate } from '../lib/dates';
import { ParsedPerson } from '../lib/importers';

export interface ContactBirthday extends ParsedPerson {
  contactId: string;
}

export async function requestContactsPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    const res = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_CONTACTS, {
      title: 'Find birthdays in your contacts',
      message: 'Bloop reads names and birthdays on this phone only. Nothing is uploaded.',
      buttonPositive: 'Allow',
      buttonNegative: 'Not now',
    });
    return res === PermissionsAndroid.RESULTS.GRANTED;
  }
  return (await Contacts.requestPermission()) === 'authorized';
}

/**
 * Contacts that carry a birthday. On Android this includes anything synced into
 * the phone's contact book (Google, WhatsApp, etc.).
 */
export async function loadContactBirthdays(): Promise<ContactBirthday[]> {
  const all = await Contacts.getAll();
  const out: ContactBirthday[] = [];
  for (const c of all) {
    const b = c.birthday;
    if (!b || !b.month || !b.day) continue;
    const year = b.year && b.year >= 1900 ? b.year : undefined;
    if (!isValidDate(b.month, b.day, year)) continue;
    const name = [c.givenName, c.middleName, c.familyName].filter(Boolean).join(' ').trim() || c.displayName;
    if (!name) continue;
    out.push({
      contactId: c.recordID,
      name,
      month: b.month,
      day: b.day,
      year,
      phone: c.phoneNumbers?.[0]?.number,
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}
