import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/medgen/src/**/*.spec.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'packages/medgen/coverage',
      reporter: ['text', 'json', 'json-summary'],
      include: ['packages/medgen/src/**/*.ts'],
      exclude: ['packages/medgen/src/**/*.spec.ts', 'packages/medgen/src/**/__fixtures__/**'],
    },
  },
});
