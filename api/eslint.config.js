import globals from 'globals'

export default [
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.commonjs,
        ...globals.es2021,
        ...globals.node,
      },
    },
    rules: {
      'multiline-ternary': 'off',
      'no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
      'arrow-parens': ['warn', 'as-needed'],
      'comma-dangle': ['error', 'always-multiline'],
      'curly': ['warn', 'multi-or-nest'],
      'indent': ['warn', 2, { offsetTernaryExpressions: false }],
      'semi': ['error', 'never'],
    },
  },
]
