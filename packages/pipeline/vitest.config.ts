import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/pipeline/src/**/*.spec.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'packages/pipeline/coverage',
      reporter: ['text', 'json', 'json-summary'],
      include: ['packages/pipeline/src/**/*.ts'],
      exclude: ['packages/pipeline/src/**/*.spec.ts', 'packages/pipeline/src/**/__fixtures__/**'],
    },
  },
});
