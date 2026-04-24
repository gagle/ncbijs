import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/sync/src/**/*.spec.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'packages/sync/coverage',
      reporter: ['text', 'json', 'json-summary'],
      include: ['packages/sync/src/**/*.ts'],
      exclude: ['packages/sync/src/**/*.spec.ts', 'packages/sync/src/**/__fixtures__/**'],
    },
  },
});
