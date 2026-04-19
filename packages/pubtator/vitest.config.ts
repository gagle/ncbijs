import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/pubtator/src/**/*.spec.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'packages/pubtator/coverage',
      reporter: ['text', 'json', 'json-summary'],
      include: ['packages/pubtator/src/**/*.ts'],
      exclude: ['packages/pubtator/src/**/*.spec.ts', 'packages/pubtator/src/**/__fixtures__/**'],
    },
  },
});
