import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    exclude: ['e2e/**', 'node_modules/**'],
    environmentMatchGlobs: [
      ['test/deployment/**', 'node'],
      ['test/solar/**', 'node'],
      ['test/api/**', 'node'],
      ['test/lib/i18n/**', 'node'],
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary'],
      include: ['lib/solar/**', 'components/custom/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
