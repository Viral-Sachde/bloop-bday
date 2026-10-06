module.exports = {
  root: true,
  extends: '@react-native',
  rules: {
    'react-native/no-inline-styles': 'off',
  },
  ignorePatterns: ['design/'],
  overrides: [
    {
      files: ['jest.setup.js'],
      env: { jest: true },
    },
    {
      files: ['scripts/**', 'qa/**'],
      env: { node: true },
    },
    {
      files: ['__tests__/**'],
      rules: { 'react-hooks/exhaustive-deps': 'off' },
    },
  ],
};
