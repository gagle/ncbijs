import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/omim/src/**/*.spec.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'packages/omim/coverage',
      reporter: ['text', 'json', 'json-summary'],
      include: ['packages/omim/src/**/*.ts'],
      exclude: ['packages/omim/src/**/*.spec.ts', 'packages/omim/src/**/__fixtures__/**'],
    },
  },
});
