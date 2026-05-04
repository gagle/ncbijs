import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/books/src/**/*.spec.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'packages/books/coverage',
      reporter: ['text', 'json', 'json-summary'],
      include: ['packages/books/src/**/*.ts'],
      exclude: ['packages/books/src/**/*.spec.ts', 'packages/books/src/**/__fixtures__/**'],
    },
  },
});
