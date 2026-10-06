import { Platform, TextStyle } from 'react-native';

export const colors = {
  forest: '#1E4D2B',
  forestDeep: '#143820',
  forestSoft: '#2C6A3E',
  lime: '#E3F988',
  butter: '#E4D96F',
  cream: '#F7F4E8',
  creamDeep: '#EFEAD6',
  paper: '#FFFFFF',
  ink: '#12261A',
  muted: '#62786A',
  line: '#E2DDC8',
  sage: '#D3E4C6',
  mint: '#EDF7CF',
  danger: '#B8432C',
  dangerSoft: '#F6DDD6',
} as const;

export const avatarPalette = [
  { bg: '#E3F988', fg: '#1E4D2B' },
  { bg: '#E4D96F', fg: '#3A3410' },
  { bg: '#D3E4C6', fg: '#1E4D2B' },
  { bg: '#1E4D2B', fg: '#E3F988' },
  { bg: '#F2C9A8', fg: '#5B2E12' },
  { bg: '#CFE3EA', fg: '#17404F' },
];

export const radius = { sm: 10, md: 16, lg: 24, xl: 32, pill: 999 } as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/**
 * Fraunces (soft, display optical size) for headings and the wordmark, Manrope for everything else.
 * Each weight is its own file in assets/fonts; set the weight by family name, never with `fontWeight`,
 * or Android falls back to the system font.
 */
export const fonts = {
  serif: 'Fraunces-Medium',
  sans: 'Manrope-Regular',
  sansMedium: 'Manrope-Medium',
  sansSemiBold: 'Manrope-SemiBold',
  sansBold: 'Manrope-Bold',
} as const;

export const type = {
  display: { fontFamily: fonts.serif, fontSize: 44, lineHeight: 50, letterSpacing: -0.6, color: colors.ink } as TextStyle,
  h1: { fontFamily: fonts.serif, fontSize: 32, lineHeight: 38, letterSpacing: -0.4, color: colors.ink } as TextStyle,
  h2: { fontFamily: fonts.serif, fontSize: 24, lineHeight: 30, letterSpacing: -0.2, color: colors.ink } as TextStyle,
  h3: { fontFamily: fonts.sansSemiBold, fontSize: 16, lineHeight: 22, color: colors.ink } as TextStyle,
  body: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 22, color: colors.ink } as TextStyle,
  small: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 18, color: colors.muted } as TextStyle,
  label: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.2,
    color: colors.muted,
    textTransform: 'uppercase',
  } as TextStyle,
  button: { fontFamily: fonts.sansSemiBold, fontSize: 16, lineHeight: 22 } as TextStyle,
};

export const shadow = Platform.select({
  ios: {
    shadowColor: '#0B2414',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  default: { elevation: 4 },
})!;

export const fillAbs = { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 } as const;
