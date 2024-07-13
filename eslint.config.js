import js from '@eslint/js';
import globals from 'globals';

export default [
  // apply recommended rules to JS files with an override
  {
    files: ['**/*.js'],
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': 'warn',
      'no-console': 'off',
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        myCustomGlobal: 'readonly',
      },
    },
  },
];
