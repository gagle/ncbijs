import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/etl/src/**/*.spec.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'packages/etl/coverage',
      reporter: ['text', 'json', 'json-summary'],
      include: ['packages/etl/src/**/*.ts'],
      exclude: ['packages/etl/src/**/*.spec.ts', 'packages/etl/src/**/__fixtures__/**'],
    },
  },
});
