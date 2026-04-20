import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/pmc/src/**/*.spec.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'packages/pmc/coverage',
      reporter: ['text', 'json', 'json-summary'],
      include: ['packages/pmc/src/**/*.ts'],
      exclude: ['packages/pmc/src/**/*.spec.ts', 'packages/pmc/src/**/__fixtures__/**'],
    },
  },
});
