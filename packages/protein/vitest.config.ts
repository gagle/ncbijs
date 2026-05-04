import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/protein/src/**/*.spec.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'packages/protein/coverage',
      reporter: ['text', 'json', 'json-summary'],
      include: ['packages/protein/src/**/*.ts'],
      exclude: ['packages/protein/src/**/*.spec.ts', 'packages/protein/src/**/__fixtures__/**'],
    },
  },
});
