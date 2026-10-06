import Clipboard from '@react-native-clipboard/clipboard';
import { Linking, Share } from 'react-native';

export function digitsOnly(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

export function whatsappUrl(text: string, phone?: string): string {
  const q = encodeURIComponent(text);
  const num = phone ? digitsOnly(phone).replace(/^\+/, '') : '';
  return num ? `whatsapp://send?phone=${num}&text=${q}` : `whatsapp://send?text=${q}`;
}

export function smsUrl(text: string, phone: string): string {
  return `sms:${digitsOnly(phone)}?body=${encodeURIComponent(text)}`;
}

export function copyText(text: string): void {
  Clipboard.setString(text);
}

export async function shareText(text: string): Promise<void> {
  await Share.share({ message: text });
}

/** Tries WhatsApp directly, then falls back to the system share sheet. */
export async function sendViaWhatsApp(text: string, phone?: string): Promise<'whatsapp' | 'share'> {
  try {
    await Linking.openURL(whatsappUrl(text, phone));
    return 'whatsapp';
  } catch {
    await shareText(text);
    return 'share';
  }
}

export async function sendSms(text: string, phone: string): Promise<void> {
  await Linking.openURL(smsUrl(text, phone));
}
