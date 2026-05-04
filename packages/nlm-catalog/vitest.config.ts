import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/nlm-catalog/src/**/*.spec.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'packages/nlm-catalog/coverage',
      reporter: ['text', 'json', 'json-summary'],
      include: ['packages/nlm-catalog/src/**/*.ts'],
      exclude: [
        'packages/nlm-catalog/src/**/*.spec.ts',
        'packages/nlm-catalog/src/**/__fixtures__/**',
      ],
    },
  },
});
