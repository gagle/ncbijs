import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/snp/src/**/*.spec.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'packages/snp/coverage',
      reporter: ['text', 'json', 'json-summary'],
      include: ['packages/snp/src/**/*.ts'],
      exclude: ['packages/snp/src/**/*.spec.ts', 'packages/snp/src/**/__fixtures__/**'],
    },
  },
});
