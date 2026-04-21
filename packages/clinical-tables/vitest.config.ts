import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/clinical-tables/src/**/*.spec.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'packages/clinical-tables/coverage',
      reporter: ['text', 'json', 'json-summary'],
      include: ['packages/clinical-tables/src/**/*.ts'],
      exclude: [
        'packages/clinical-tables/src/**/*.spec.ts',
        'packages/clinical-tables/src/**/__fixtures__/**',
      ],
    },
  },
});
