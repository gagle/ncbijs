import { createPackageConfig } from '../../eslint.base.config.mjs';

export default [
  ...createPackageConfig(),
  {
    files: ['**/detect.ts'],
    rules: {
      'no-console': 'off',
    },
  },
];
