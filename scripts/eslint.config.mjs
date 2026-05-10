import { createPackageConfig } from '../eslint.base.config.mjs';

export default [
  ...createPackageConfig(),
  {
    files: ['**/detect.ts', '**/sync-docs.ts', '**/check-claude-md.ts'],
    rules: {
      'no-console': 'off',
    },
  },
];
