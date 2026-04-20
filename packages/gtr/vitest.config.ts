import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/gtr/src/**/*.spec.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'packages/gtr/coverage',
      reporter: ['text', 'json', 'json-summary'],
      include: ['packages/gtr/src/**/*.ts'],
      exclude: ['packages/gtr/src/**/*.spec.ts', 'packages/gtr/src/**/__fixtures__/**'],
    },
  },
});
