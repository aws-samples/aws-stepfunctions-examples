module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  overrides: [],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['react', 'prettier', 'simple-import-sort'],
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/no-unescaped-entities': 'off',
    'prettier/prettier': ['warn', { singleQuote: true, printWidth: 90 }],
    'linebreak-style': ['error', 'unix'],
    indent: ['warn', 2, { SwitchCase: 1 }],
    quotes: ['warn', 'single'],
    semi: ['error', 'always'],
    'simple-import-sort/imports': 'error',
    'simple-import-sort/exports': 'error',
    '@typescript-eslint/no-empty-function': 'off',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
