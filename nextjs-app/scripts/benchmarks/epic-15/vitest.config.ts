import { defineConfig } from 'vitest/config';
import path from 'node:path';
export default defineConfig({
  resolve:{alias:{'@':path.resolve(process.cwd())}},
  test:{environment:'node',include:['scripts/benchmarks/epic-15/*.measurement.ts'],setupFiles:[],fileParallelism:false,testTimeout:1200000},
});
