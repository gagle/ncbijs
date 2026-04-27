import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['e2e/**/*.spec.ts'],
    exclude: ['e2e/bulk-parsers/**'],
    restoreMocks: true,
    testTimeout: 120_000,
    hookTimeout: 120_000,
    retry: 2,
    fileParallelism: false,
    globalSetup: ['e2e/global-setup.ts'],
  },
});
