import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { AD_UNITS } from '../services/ads';
import { colors, radius, spacing, type } from '../theme';

/**
 * Both slots mount the ad immediately (it has to be mounted to load) but stay
 * collapsed until Google actually fills it, so users never see an empty box.
 */

/** Adaptive banner pinned above the tab bar. */
export function BannerSlot() {
  const [state, setState] = useState<'loading' | 'loaded' | 'failed'>('loading');
  if (state === 'failed') return null;
  return (
    <View style={[styles.banner, state === 'loading' && styles.collapsed]} testID="ad-banner">
      <BannerAd
        unitId={AD_UNITS.banner}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdLoaded={() => setState('loaded')}
        onAdFailedToLoad={() => setState('failed')}
      />
    </View>
  );
}

/** Inline card-style ad dropped into long lists, clearly labelled. */
export function InlineAdCard() {
  const [state, setState] = useState<'loading' | 'loaded' | 'failed'>('loading');
  if (state === 'failed') return null;
  return (
    <View style={[styles.card, state === 'loading' && styles.collapsed]} testID="ad-inline">
      <Text style={[type.label, { marginBottom: spacing.sm }]}>Sponsored</Text>
      <View style={{ alignItems: 'center' }}>
        <BannerAd
          unitId={AD_UNITS.rectangle}
          size={BannerAdSize.MEDIUM_RECTANGLE}
          onAdLoaded={() => setState('loaded')}
          onAdFailedToLoad={() => setState('failed')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { alignItems: 'center', backgroundColor: colors.cream },
  card: {
    backgroundColor: colors.paper,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.line,
  },
  collapsed: { height: 0, padding: 0, marginVertical: 0, borderWidth: 0, overflow: 'hidden', opacity: 0 },
});
