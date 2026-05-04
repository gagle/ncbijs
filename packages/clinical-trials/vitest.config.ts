import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/clinical-trials/src/**/*.spec.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'packages/clinical-trials/coverage',
      reporter: ['text', 'json', 'json-summary'],
      include: ['packages/clinical-trials/src/**/*.ts'],
      exclude: [
        'packages/clinical-trials/src/**/*.spec.ts',
        'packages/clinical-trials/src/**/__fixtures__/**',
      ],
    },
  },
});
