import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/dailymed/src/**/*.spec.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'packages/dailymed/coverage',
      reporter: ['text', 'json', 'json-summary'],
      include: ['packages/dailymed/src/**/*.ts'],
      exclude: ['packages/dailymed/src/**/*.spec.ts', 'packages/dailymed/src/**/__fixtures__/**'],
    },
  },
});
