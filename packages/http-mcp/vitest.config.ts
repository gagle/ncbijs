import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/http-mcp/src/**/*.spec.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'packages/http-mcp/coverage',
      reporter: ['text', 'json', 'json-summary'],
      include: ['packages/http-mcp/src/**/*.ts'],
      exclude: ['packages/http-mcp/src/**/*.spec.ts', 'packages/http-mcp/src/index.ts'],
    },
  },
});
