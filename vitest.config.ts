import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'packages/**/*.test.ts',
      'tests/**/*.test.ts',
      'apps/web/src/**/*.test.{ts,tsx}',
    ],
    clearMocks: true,
    // Keep jsdom/KaTeX rendering and the embedded database from competing for CPU.
    maxWorkers: 1,
  },
});
