import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/geo/src/**/*.spec.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'packages/geo/coverage',
      reporter: ['text', 'json', 'json-summary'],
      include: ['packages/geo/src/**/*.ts'],
      exclude: ['packages/geo/src/**/*.spec.ts', 'packages/geo/src/**/__fixtures__/**'],
    },
  },
});
