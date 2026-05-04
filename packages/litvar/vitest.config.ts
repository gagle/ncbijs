import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/litvar/src/**/*.spec.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'packages/litvar/coverage',
      reporter: ['text', 'json', 'json-summary'],
      include: ['packages/litvar/src/**/*.ts'],
      exclude: ['packages/litvar/src/**/*.spec.ts', 'packages/litvar/src/**/__fixtures__/**'],
    },
  },
});
