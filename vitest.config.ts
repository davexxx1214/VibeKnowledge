import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'out', 'packages/**'],
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
    },
    alias: {
      // Mock VS Code module for testing
      vscode: new URL('./tests/__mocks__/vscode.ts', import.meta.url).pathname
    }
  }
});

