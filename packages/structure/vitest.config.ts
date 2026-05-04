import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/structure/src/**/*.spec.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'packages/structure/coverage',
      reporter: ['text', 'json', 'json-summary'],
      include: ['packages/structure/src/**/*.ts'],
      exclude: ['packages/structure/src/**/*.spec.ts', 'packages/structure/src/**/__fixtures__/**'],
    },
  },
});
