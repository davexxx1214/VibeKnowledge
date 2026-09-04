const js = require('@eslint/js');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const { defineConfig, globalIgnores } = require('eslint/config');

module.exports = defineConfig([
  globalIgnores([
    '**/node_modules/**',
    '**/out/**',
    '**/dist/**',
    '**/coverage/**',
    '.vscode-test/**',
    '.codex-remote-attachments/**',
    '**/*.d.ts',
    'src/services/structuralGraph/fixtures/**',
  ]),
  {
    files: ['src/**/*.ts'],
    extends: [js.configs.recommended, tsPlugin.configs['flat/recommended']],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
    },
    // Preserve the project's existing TypeScript rules and severity levels.
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      '@typescript-eslint/naming-convention': 'warn',
      curly: 'warn',
      eqeqeq: 'warn',
      'no-throw-literal': 'warn',
      semi: 'off',
    },
  },
]);
