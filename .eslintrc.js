

module.exports = {
  root: true,
  plugins: [
    '@typescript-eslint',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
  },
  rules: {
    'quotes': ['warn', 'single', {avoidEscape: true}],
    'no-constant-condition': ['error', {checkLoops: false}],
    '@typescript-eslint/no-non-null-assertion': ['off']
  },
  ignorePatterns: ['.eslintrc.js', 'build/**/*.js']
}
