import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/icite/src/**/*.spec.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'packages/icite/coverage',
      reporter: ['text', 'json', 'json-summary'],
      include: ['packages/icite/src/**/*.ts'],
      exclude: ['packages/icite/src/**/*.spec.ts', 'packages/icite/src/**/__fixtures__/**'],
    },
  },
});
