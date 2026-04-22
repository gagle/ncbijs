import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/store-mcp/src/**/*.spec.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'packages/store-mcp/coverage',
      reporter: ['text', 'json', 'json-summary'],
      include: ['packages/store-mcp/src/**/*.ts'],
      exclude: ['packages/store-mcp/src/**/*.spec.ts', 'packages/store-mcp/src/index.ts'],
    },
  },
});
