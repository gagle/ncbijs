import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/sra/src/**/*.spec.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'packages/sra/coverage',
      reporter: ['text', 'json', 'json-summary'],
      include: ['packages/sra/src/**/*.ts'],
      exclude: ['packages/sra/src/**/*.spec.ts', 'packages/sra/src/**/__fixtures__/**'],
    },
  },
});
