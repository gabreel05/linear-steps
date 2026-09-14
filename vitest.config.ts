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
  },
});
