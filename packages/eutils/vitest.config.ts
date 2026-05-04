import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/eutils/src/**/*.spec.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'packages/eutils/coverage',
      reporter: ['text', 'json', 'json-summary'],
      include: ['packages/eutils/src/**/*.ts'],
      exclude: ['packages/eutils/src/**/*.spec.ts', 'packages/eutils/src/**/__fixtures__/**'],
    },
  },
});
