import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/cite/src/**/*.spec.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'packages/cite/coverage',
      reporter: ['text', 'json', 'json-summary'],
      include: ['packages/cite/src/**/*.ts'],
      exclude: ['packages/cite/src/**/*.spec.ts', 'packages/cite/src/**/__fixtures__/**'],
    },
  },
});
