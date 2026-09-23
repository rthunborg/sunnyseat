import { defineConfig } from 'vitest/config';
import path from 'node:path';
export default defineConfig({
  test: { environment: 'node', include: ['test/integration/epic-15/storage.revalidation.ts'], testTimeout: 600000, fileParallelism: false },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
});
