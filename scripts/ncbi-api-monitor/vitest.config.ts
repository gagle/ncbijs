import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['scripts/ncbi-api-monitor/**/*.spec.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'scripts/ncbi-api-monitor/coverage',
      reporter: ['text', 'json', 'json-summary'],
      include: ['scripts/ncbi-api-monitor/**/*.ts'],
      exclude: [
        'scripts/ncbi-api-monitor/**/*.spec.ts',
        'scripts/ncbi-api-monitor/vitest.config.ts',
      ],
    },
  },
});
