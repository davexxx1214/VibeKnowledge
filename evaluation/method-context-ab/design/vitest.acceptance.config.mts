import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

// Authoring-only baseline runner. The frozen check is intentionally not a
// *.test.ts file and therefore is invisible to the repository's default suite.
// Run from the repository root. Grading uses its ordinary Vitest configuration
// after copying acceptance.check.ts to tests/method-context-acceptance.test.ts.
export default defineConfig({
  resolve: {
    alias: [{ find: /^\.\.\/src\//, replacement: resolve('src').replace(/\\/g, '/') + '/' }],
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['evaluation/method-context-ab/design/acceptance.check.ts'],
    setupFiles: ['./tests/setup.ts'],
  },
});
