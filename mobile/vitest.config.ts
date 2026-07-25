import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Unit tests under `src/` use `src/tsconfig.json` (no Expo base).
 * App typecheck still uses `mobile/tsconfig.json` → expo/tsconfig.base.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/__tests__/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
