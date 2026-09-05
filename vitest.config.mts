import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'src/**/*.test.ts',
      'tests/**/*.test.ts',
      'evaluation/**/*.test.ts'
    ],
    // This node:test source is a frozen authoring artifact, not a Vitest suite.
    exclude: ['node_modules', 'dist', 'out', 'packages/**', 'evaluation/skill-precision/fixture/**'],
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'out/**',
        '**/*.test.ts',
        '**/types/**',
        'esbuild.js'
      ]
    }
  }
});
