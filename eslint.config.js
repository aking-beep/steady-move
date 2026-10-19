const tseslint = require('typescript-eslint');
const reactHooks = require('eslint-plugin-react-hooks');

module.exports = tseslint.config(
  {ignores: ['node_modules/**', '.expo/**', '.test-build/**', 'dist/**', 'tests/**', 'eslint.config.js', 'babel.config.js']},
  ...tseslint.configs.recommended,
  {
    plugins: {'react-hooks': reactHooks},
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-console': ['error', {allow: ['warn']}],
      '@typescript-eslint/no-unused-vars': ['error', {argsIgnorePattern: '^_', varsIgnorePattern: '^_'}],
      '@typescript-eslint/no-explicit-any': 'error'
    }
  }
);
