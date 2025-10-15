import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      // Exclude test stubs from Story 4.2 (documentation only, not executable tests)
      '**/ConfidenceBadge.test.tsx',
      '**/EmptyState.test.tsx',
      '**/MiniTimeline.test.tsx',
      '**/PatioCard.test.tsx',
      '**/PatioList.test.tsx',
    ],
  },
})
