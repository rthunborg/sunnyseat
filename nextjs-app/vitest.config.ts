import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup/setup.ts'],
    include: ['test/unit/**/*.test.{ts,tsx}', 'test/components/**/*.test.{ts,tsx}'],
    exclude: ['test/e2e/**', 'node_modules', '.next'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
