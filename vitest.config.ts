import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  oxc: {
    jsx: {
      runtime: 'automatic',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      'server-only': path.resolve(__dirname, 'tests/unit/server-only-stub.ts'),
    },
  },
  test: {
    include: ['lib/**/*.test.ts', 'tests/unit/**/*.test.ts'],
  },
});
