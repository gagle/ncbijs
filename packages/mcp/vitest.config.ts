import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/mcp/src/**/*.spec.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'packages/mcp/coverage',
      reporter: ['text', 'json', 'json-summary'],
      include: ['packages/mcp/src/**/*.ts'],
      exclude: ['packages/mcp/src/**/*.spec.ts', 'packages/mcp/src/index.ts'],
    },
  },
});
