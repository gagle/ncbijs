import { sharedConfig } from '../eslint.base.config.mjs';

export default [
  ...sharedConfig,
  {
    files: ['scripts/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
];
