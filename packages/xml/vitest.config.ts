import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/xml/src/**/*.spec.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'packages/xml/coverage',
      reporter: ['text', 'json', 'json-summary'],
      include: ['packages/xml/src/**/*.ts'],
      exclude: ['packages/xml/src/**/*.spec.ts', 'packages/xml/src/**/__fixtures__/**'],
    },
  },
});
