import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/rate-limiter/src/**/*.spec.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'packages/rate-limiter/coverage',
      reporter: ['text', 'json', 'json-summary'],
      include: ['packages/rate-limiter/src/**/*.ts'],
      exclude: [
        'packages/rate-limiter/src/**/*.spec.ts',
        'packages/rate-limiter/src/**/__fixtures__/**',
      ],
    },
  },
});
