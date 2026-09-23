import { defineConfig } from 'vitest/config';
import path from 'node:path';
export default defineConfig({
  // The captured full two-year fixture takes over three hours with one worker.
  test: { environment: 'node', include: ['test/integration/epic-15/storage.measurement.ts'], testTimeout: 21600000, fileParallelism: false },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
});
