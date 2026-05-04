import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/pubmed-xml/src/**/*.spec.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'packages/pubmed-xml/coverage',
      reporter: ['text', 'json', 'json-summary'],
      include: ['packages/pubmed-xml/src/**/*.ts'],
      exclude: [
        'packages/pubmed-xml/src/**/*.spec.ts',
        'packages/pubmed-xml/src/**/__fixtures__/**',
      ],
    },
  },
});
