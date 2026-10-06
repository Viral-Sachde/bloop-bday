import mobileAds, {
  AdsConsent,
  InterstitialAd,
  MaxAdContentRating,
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

/**
 * Ad units. These are Google's public TEST ids: they always fill and are safe
 * to click. Swap each for a real unit id from your AdMob console (and the app
 * ids in app.json / AndroidManifest.xml / Info.plist) before shipping.
 */
export const AD_UNITS = {
  banner: TestIds.ADAPTIVE_BANNER,
  rectangle: TestIds.BANNER,
  interstitialVideo: TestIds.INTERSTITIAL_VIDEO as string,
  rewardedVideo: TestIds.REWARDED,
} as const;

let initPromise: Promise<void> | null = null;

export function initAds(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        // EU/UK consent form (no-op elsewhere).
        await AdsConsent.gatherConsent();
      } catch {
        // Consent not configured yet. Ads still run in test mode.
      }
      await mobileAds().setRequestConfiguration({
        maxAdContentRating: MaxAdContentRating.PG,
        tagForChildDirectedTreatment: false,
      });
      await mobileAds().initialize();
    })().catch(() => {
      initPromise = null;
    });
  }
  return initPromise;
}

// ---- Interstitial (video) with a frequency cap ------------------------------

const INTERSTITIAL_GAP_MS = 3 * 60 * 1000;
// Starts at launch so nobody gets a full-screen ad on their very first action.
let lastInterstitialAt = Date.now();
let interstitial: InterstitialAd | null = null;
let interstitialLoaded = false;

export function shouldShowInterstitial(now: number, last: number, gap = INTERSTITIAL_GAP_MS): boolean {
  return now - last >= gap;
}

function loadInterstitial() {
  interstitialLoaded = false;
  interstitial = InterstitialAd.createForAdRequest(AD_UNITS.interstitialVideo);
  interstitial.addAdEventListener(AdEventType.LOADED, () => {
    interstitialLoaded = true;
  });
  interstitial.addAdEventListener(AdEventType.CLOSED, loadInterstitial);
  interstitial.addAdEventListener(AdEventType.ERROR, () => {
    interstitialLoaded = false;
  });
  interstitial.load();
}

export function preloadInterstitial() {
  if (!interstitial) loadInterstitial();
}

/** Shows a full-screen video ad at a natural pause. Silent no-op when capped or not ready. */
export function maybeShowInterstitial(): boolean {
  if (!interstitial || !interstitialLoaded) return false;
  if (!shouldShowInterstitial(Date.now(), lastInterstitialAt)) return false;
  lastInterstitialAt = Date.now();
  try {
    interstitial.show();
    return true;
  } catch {
    return false;
  }
}

// ---- Rewarded video ----------------------------------------------------------

/** Resolves true only if the viewer actually earned the reward. */
export function showRewardedVideo(): Promise<boolean> {
  return new Promise(resolve => {
    const ad = RewardedAd.createForAdRequest(AD_UNITS.rewardedVideo);
    let earned = false;
    let settled = false;
    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      unsubs.forEach(u => u());
      resolve(value);
    };
    const unsubs = [
      ad.addAdEventListener(RewardedAdEventType.LOADED, () => ad.show()),
      ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        earned = true;
      }),
      ad.addAdEventListener(AdEventType.CLOSED, () => finish(earned)),
      ad.addAdEventListener(AdEventType.ERROR, () => finish(false)),
    ];
    ad.load();
    // Never leave the UI hanging on a slow network.
    setTimeout(() => finish(earned), 45_000);
  });
}
