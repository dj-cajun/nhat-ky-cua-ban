import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  workspaces: {
    '.': {
      entry: [
        'src/main.{ts,tsx}',
        'src/app.{ts,tsx}',
        'tests/**/*.{ts,tsx}',
        'e2e/**/*.{ts,tsx}',
      ],
      project: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}', 'e2e/**/*.{ts,tsx}'],
    },
    mobile: {
      entry: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
      project: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
    },
  },
  ignore: [
    '**/*.d.ts',
    '**/database.generated.ts',
    'supabase/functions/**',
    'supabase/migrations/**',
  ],
  ignoreDependencies: [
    // used via PostCSS / Tailwind / CI tooling, not always imported
    'vercel',
    'autoprefixer',
    'postcss',
    'tailwindcss',
    '@vitest/coverage-v8',
    // babel config plugin
    'babel-plugin-module-resolver',
    // referenced from app.json / EAS later
    'expo-updates',
    'expo-system-ui',
  ],
  ignoreBinaries: ['supabase'],
  // Domain contracts kept for shared web/mobile typing ahead of codegen
  ignoreExportsUsedInFile: true,
};

export default config;
