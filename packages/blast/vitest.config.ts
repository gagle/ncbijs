import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/blast/src/**/*.spec.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'packages/blast/coverage',
      reporter: ['text', 'json', 'json-summary'],
      include: ['packages/blast/src/**/*.ts'],
      exclude: ['packages/blast/src/**/*.spec.ts', 'packages/blast/src/**/__fixtures__/**'],
    },
  },
});
