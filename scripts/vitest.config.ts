import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['scripts/**/*.spec.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'scripts/coverage',
      reporter: ['text', 'json', 'json-summary'],
      include: ['scripts/**/*.ts'],
      exclude: ['scripts/**/*.spec.ts', 'scripts/vitest.config.ts', 'scripts/**/coverage/**'],
    },
  },
});
