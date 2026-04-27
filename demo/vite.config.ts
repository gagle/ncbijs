import { defineConfig } from 'vite';
import { resolve } from 'node:path';

const sharedArrayBufferHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

export default defineConfig({
  base: '/ncbijs/',
  root: resolve(import.meta.dirname, 'src'),
  publicDir: resolve(import.meta.dirname, 'public'),
  build: {
    outDir: resolve(import.meta.dirname, 'dist'),
    emptyOutDir: true,
  },
  optimizeDeps: {
    exclude: ['@duckdb/duckdb-wasm'],
  },
  server: {
    headers: sharedArrayBufferHeaders,
  },
  preview: {
    headers: sharedArrayBufferHeaders,
  },
});
