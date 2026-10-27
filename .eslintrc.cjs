module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-essential',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: 'vue-eslint-parser',
  parserOptions: { parser: '@typescript-eslint/parser', sourceType: 'module' },
  rules: { 'vue/multi-word-component-names': 'off', 'vue/html-self-closing': 'off' },
};
