import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['e2e/**/*.spec.ts'],
    restoreMocks: true,
    testTimeout: 120_000,
    hookTimeout: 120_000,
    fileParallelism: false,
    globalSetup: ['e2e/global-setup.ts'],
  },
});
