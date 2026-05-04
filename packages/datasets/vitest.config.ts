import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/datasets/src/**/*.spec.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'packages/datasets/coverage',
      reporter: ['text', 'json', 'json-summary'],
      include: ['packages/datasets/src/**/*.ts'],
      exclude: ['packages/datasets/src/**/*.spec.ts', 'packages/datasets/src/**/__fixtures__/**'],
    },
  },
});
