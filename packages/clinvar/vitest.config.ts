import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/clinvar/src/**/*.spec.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'packages/clinvar/coverage',
      reporter: ['text', 'json', 'json-summary'],
      include: ['packages/clinvar/src/**/*.ts'],
      exclude: ['packages/clinvar/src/**/*.spec.ts', 'packages/clinvar/src/**/__fixtures__/**'],
    },
  },
});
