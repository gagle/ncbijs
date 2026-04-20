import { sharedConfig } from '../eslint.base.config.mjs';

export default [
  ...sharedConfig,
  {
    files: ['**/*.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
];
