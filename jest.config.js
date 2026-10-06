module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/', '/qa/'],
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|@react-navigation|@notifee|@react-native-community|@react-native-documents|@react-native-camera-roll|@react-native-clipboard|react-native-.*)/)',
  ],
  collectCoverageFrom: ['src/lib/**/*.ts', 'src/store.ts', 'src/services/notifications.ts', 'src/screens/**/*.tsx'],
};
