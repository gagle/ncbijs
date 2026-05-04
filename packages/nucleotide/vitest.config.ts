import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/nucleotide/src/**/*.spec.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'packages/nucleotide/coverage',
      reporter: ['text', 'json', 'json-summary'],
      include: ['packages/nucleotide/src/**/*.ts'],
      exclude: [
        'packages/nucleotide/src/**/*.spec.ts',
        'packages/nucleotide/src/**/__fixtures__/**',
      ],
    },
  },
});
