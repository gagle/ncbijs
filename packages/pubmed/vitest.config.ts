import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/pubmed/src/**/*.spec.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'packages/pubmed/coverage',
      reporter: ['text', 'json', 'json-summary'],
      include: ['packages/pubmed/src/**/*.ts'],
      exclude: ['packages/pubmed/src/**/*.spec.ts', 'packages/pubmed/src/**/__fixtures__/**'],
    },
  },
});
