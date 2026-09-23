import { defineConfig } from 'vitest/config';
import path from 'node:path';
export default defineConfig({
  test: { environment: 'node', include: ['test/integration/epic-15/*.test.ts'], testTimeout: 180000 },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
});
