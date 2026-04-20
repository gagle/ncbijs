import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/dbvar/src/**/*.spec.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'packages/dbvar/coverage',
      reporter: ['text', 'json', 'json-summary'],
      include: ['packages/dbvar/src/**/*.ts'],
      exclude: ['packages/dbvar/src/**/*.spec.ts', 'packages/dbvar/src/**/__fixtures__/**'],
    },
  },
});
