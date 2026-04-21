import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/bioc/src/**/*.spec.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'packages/bioc/coverage',
      reporter: ['text', 'json', 'json-summary'],
      include: ['packages/bioc/src/**/*.ts'],
      exclude: ['packages/bioc/src/**/*.spec.ts', 'packages/bioc/src/**/__fixtures__/**'],
    },
  },
});
