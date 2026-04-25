import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default [
  // Layer 0 — Ignores globali
  {
    ignores: ['dist/', 'node_modules/', 'vite.config.ts'],
  },

  // Layer 1 — @eslint/js recommended (JavaScript di base)
  {
    ...js.configs.recommended,
    files: ['**/*.{js,ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.es2020 },
    },
    rules: {
      ...js.configs.recommended.rules,
      // Fase A: abbasso a warn le regole error del preset base
      'prefer-const': 'warn',
    },
  },

  // Layer 2 — typescript-eslint recommended
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ...config.languageOptions,
      parserOptions: {
        ...config.languageOptions?.parserOptions,
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      ...config.rules,
      // Fase A: abbasso a warn le regole error del preset recommended
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'prefer-const': 'warn',
    },
  })),

  // Layer 3 — eslint-plugin-react-hooks (Fase A: warn)
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // Layer 4 — eslint-plugin-react-refresh (Fase A: warn)
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-refresh': reactRefresh },
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // Layer 5 — eslint-plugin-jsx-a11y recommended (Fase A: tutte le regole in warn)
  {
    ...jsxA11y.flatConfigs.recommended,
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      // Fase A: abbasso tutte le regole recommended a warn (non error)
      ...Object.fromEntries(
        Object.keys(jsxA11y.flatConfigs.recommended.rules).map((rule) => [rule, 'warn'])
      ),
    },
  },

  // Layer 6 — Disabilita react-refresh/only-export-components per file shadcn/ui e context
  // Questi file seguono pattern legittimi di multi-export (componenti shadcn e hook + provider React).
  {
    files: ['src/components/ui/**/*.{ts,tsx}', 'src/context/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
      'jsx-a11y/anchor-has-content': 'off',
    },
  },
];
