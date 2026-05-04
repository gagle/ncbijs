import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/genbank/src/**/*.spec.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'packages/genbank/coverage',
      reporter: ['text', 'json', 'json-summary'],
      include: ['packages/genbank/src/**/*.ts'],
      exclude: ['packages/genbank/src/**/*.spec.ts', 'packages/genbank/src/**/__fixtures__/**'],
    },
  },
});
