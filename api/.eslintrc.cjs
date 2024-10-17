module.exports = {
  root: true,
  env: {
    // browser: true,
    commonjs: true,
    es2021: true,
    node: true,
  },
  extends: [
    // 'plugin:react/recommended',
    'standard',
  ],
  // settings: {
  //   react: {
  //     version: 'detect',
  //   },
  // },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'multiline-ternary': 'off',
    'no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
    'arrow-parens': ['warn', 'as-needed'],
    'comma-dangle': ['error', 'always-multiline'],
    curly: ['warn', 'multi-or-nest'],
    indent: ['warn', 2, { offsetTernaryExpressions: false }],
    semi: ['error', 'never'],
  },
}
