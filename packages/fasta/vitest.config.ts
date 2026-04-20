import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/fasta/src/**/*.spec.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'packages/fasta/coverage',
      reporter: ['text', 'json', 'json-summary'],
      include: ['packages/fasta/src/**/*.ts'],
      exclude: ['packages/fasta/src/**/*.spec.ts', 'packages/fasta/src/**/__fixtures__/**'],
    },
  },
});
