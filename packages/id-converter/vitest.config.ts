import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/id-converter/src/**/*.spec.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'packages/id-converter/coverage',
      reporter: ['text', 'json', 'json-summary'],
      include: ['packages/id-converter/src/**/*.ts'],
      exclude: [
        'packages/id-converter/src/**/*.spec.ts',
        'packages/id-converter/src/**/__fixtures__/**',
      ],
    },
  },
});
