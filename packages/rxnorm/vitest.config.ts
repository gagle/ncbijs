import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/rxnorm/src/**/*.spec.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'packages/rxnorm/coverage',
      reporter: ['text', 'json', 'json-summary'],
      include: ['packages/rxnorm/src/**/*.ts'],
      exclude: ['packages/rxnorm/src/**/*.spec.ts', 'packages/rxnorm/src/**/__fixtures__/**'],
    },
  },
});
