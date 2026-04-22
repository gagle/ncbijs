import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/store/src/**/*.spec.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'packages/store/coverage',
      reporter: ['text', 'json', 'json-summary'],
      include: ['packages/store/src/**/*.ts'],
      exclude: ['packages/store/src/**/*.spec.ts', 'packages/store/src/**/__fixtures__/**'],
    },
  },
});
