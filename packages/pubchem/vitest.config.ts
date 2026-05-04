import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/pubchem/src/**/*.spec.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'packages/pubchem/coverage',
      reporter: ['text', 'json', 'json-summary'],
      include: ['packages/pubchem/src/**/*.ts'],
      exclude: ['packages/pubchem/src/**/*.spec.ts', 'packages/pubchem/src/**/__fixtures__/**'],
    },
  },
});
