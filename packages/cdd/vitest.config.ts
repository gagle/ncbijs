import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/cdd/src/**/*.spec.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'packages/cdd/coverage',
      reporter: ['text', 'json', 'json-summary'],
      include: ['packages/cdd/src/**/*.ts'],
      exclude: ['packages/cdd/src/**/*.spec.ts', 'packages/cdd/src/**/__fixtures__/**'],
    },
  },
});
