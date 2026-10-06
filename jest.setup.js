/* Native-module mocks shared by every test. */

jest.mock('@react-native-async-storage/async-storage', () => {
  let store = {};
  const api = {
    getItem: jest.fn(async k => (k in store ? store[k] : null)),
    setItem: jest.fn(async (k, v) => {
      store[k] = v;
    }),
    removeItem: jest.fn(async k => {
      delete store[k];
    }),
    clear: jest.fn(async () => {
      store = {};
    }),
  };
  return { __esModule: true, default: api, ...api };
});

jest.mock('@notifee/react-native', () => {
  const notifee = {
    createChannel: jest.fn(async () => 'bloop-birthdays'),
    cancelTriggerNotifications: jest.fn(async () => {}),
    createTriggerNotification: jest.fn(async () => 'id'),
    requestPermission: jest.fn(async () => ({ authorizationStatus: 1 })),
    getNotificationSettings: jest.fn(async () => ({ authorizationStatus: 1, android: { alarm: 1 } })),
    openAlarmPermissionSettings: jest.fn(async () => {}),
    getInitialNotification: jest.fn(async () => null),
    onForegroundEvent: jest.fn(() => () => {}),
    onBackgroundEvent: jest.fn(),
  };
  return {
    __esModule: true,
    default: notifee,
    AndroidImportance: { HIGH: 4 },
    AndroidVisibility: { PUBLIC: 1 },
    AndroidNotificationSetting: { ENABLED: 1, DISABLED: 0, NOT_SUPPORTED: -1 },
    EventType: { DELIVERED: 3, PRESS: 1, ACTION_PRESS: 2 },
    TriggerType: { TIMESTAMP: 0 },
  };
});

jest.mock('react-native-google-mobile-ads', () => {
  const React = require('react');
  const { View } = require('react-native');
  const listener = () => () => {};
  const ad = { addAdEventListener: jest.fn(listener), load: jest.fn(), show: jest.fn() };
  return {
    __esModule: true,
    default: () => ({ initialize: jest.fn(async () => []), setRequestConfiguration: jest.fn(async () => {}) }),
    AdsConsent: { gatherConsent: jest.fn(async () => {}) },
    MaxAdContentRating: { PG: 'PG' },
    TestIds: { ADAPTIVE_BANNER: 'banner', BANNER: 'rect', INTERSTITIAL_VIDEO: 'inter', REWARDED: 'rew' },
    BannerAd: () => React.createElement(View, { testID: 'mock-banner-ad' }),
    BannerAdSize: { ANCHORED_ADAPTIVE_BANNER: 'a', MEDIUM_RECTANGLE: 'm' },
    InterstitialAd: { createForAdRequest: jest.fn(() => ad) },
    RewardedAd: { createForAdRequest: jest.fn(() => ad) },
    RewardedAdEventType: { LOADED: 'loaded', EARNED_REWARD: 'earned' },
    AdEventType: { LOADED: 'loaded', CLOSED: 'closed', ERROR: 'error' },
  };
});

jest.mock('@react-native-clipboard/clipboard', () => ({ __esModule: true, default: { setString: jest.fn() } }));
jest.mock('react-native-contacts', () => ({
  __esModule: true,
  default: { getAll: jest.fn(async () => []), requestPermission: jest.fn(async () => 'authorized') },
}));
jest.mock('@react-native-camera-roll/camera-roll', () => ({
  CameraRoll: { getPhotos: jest.fn(async () => ({ edges: [], page_info: { has_next_page: false } })) },
}));
jest.mock('@react-native-documents/picker', () => ({
  pick: jest.fn(),
  types: { allFiles: '*/*' },
  errorCodes: { OPERATION_CANCELED: 'OPERATION_CANCELED' },
  isErrorWithCode: () => false,
}));
jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaView: ({ children }) => children,
    useSafeAreaInsets: () => inset,
  };
});
