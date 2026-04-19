import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/jats/src/**/*.spec.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'packages/jats/coverage',
      reporter: ['text', 'json', 'json-summary'],
      include: ['packages/jats/src/**/*.ts'],
      exclude: ['packages/jats/src/**/*.spec.ts', 'packages/jats/src/**/__fixtures__/**'],
    },
  },
});
