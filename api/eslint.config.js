import globals from 'globals'
import js from '@eslint/js'
import eslintConfigStandard from 'eslint-config-standard'
import importPlugin from 'eslint-plugin-import'
import nPlugin from 'eslint-plugin-n'
import promisePlugin from 'eslint-plugin-promise'

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.commonjs,
        ...globals.es2021,
        ...globals.node,
      },
    },
    plugins: {
      import: importPlugin,
      n: nPlugin,
      promise: promisePlugin,
    },
    rules: {
      ...eslintConfigStandard.rules,
      'multiline-ternary': 'off',
      'no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
      'arrow-parens': ['warn', 'as-needed'],
      'comma-dangle': ['error', 'always-multiline'],
      curly: ['warn', 'multi-or-nest'],
      indent: ['warn', 2, { offsetTernaryExpressions: false }],
      semi: ['error', 'never'],
    },
  },
]
