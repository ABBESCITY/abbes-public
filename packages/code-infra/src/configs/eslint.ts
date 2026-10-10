import fs from 'node:fs';
import path from 'node:path';
import globals from 'globals';
import eslintJs from '@eslint/js';
import nextEslint from '@next/eslint-plugin-next';
import { defineConfig, includeIgnoreFile } from '@eslint/config-helpers';

import tseslint from 'typescript-eslint';
import * as mdxPlugin from 'eslint-plugin-mdx';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import compatPlugin from 'eslint-plugin-compat';
import importPlugin from 'eslint-plugin-import';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import eslintConfigPrettier from 'eslint-config-prettier/flat';

import { EXTENSION_JS, EXTENSION_TS } from '../constants/extension';

function includeIgnoreIfExists(filePath: string, description: string) {
  if (fs.existsSync(filePath)) {
    return includeIgnoreFile(filePath, description);
  }
  return [];
}

export function createBaseEslintConfig({ baseDirectory = process.cwd() }: { baseDirectory: string }) {
  return defineConfig([
    includeIgnoreIfExists(path.join(baseDirectory, '.gitignore'), 'Ignore the .gitignore'),
    includeIgnoreIfExists(path.join(baseDirectory, '.gitignore'), 'Ignore rules from .gitignore'),
    {
      name: 'Base Eslint Config',
      languageOptions: {
        ecmaVersion: 2025,
        sourceType: 'module',
        globals: { ...globals.es2025, ...globals.browser, ...globals.node },
      },
      settings: {
        react: {
          // The reactPlugin incompatible the Eslint v10. so fixed the react version
          version: '19.2.8',
        },
        browserslistOpts: {
          config: path.join(baseDirectory, '.browserslistrc'),
          env: 'stable',
          ignoreUnknownVersions: true,
        },
      },
    },
    {
      name: 'Base Ecma Javascript Config',
      files: [`**/*.{${EXTENSION_JS},${EXTENSION_TS}`],
      extends: [
        eslintJs.configs.recommended,
        tseslint.configs.recommended,
        reactPlugin.configs.flat.recommended,
        reactHooksPlugin.configs.flat.recommended,
        jsxA11yPlugin.flatConfigs.recommended,
        importPlugin.flatConfigs.recommended,
        importPlugin.flatConfigs.react,
        importPlugin.flatConfigs.typescript,
        compatPlugin.configs['flat/recommended'],
      ],
      rules: {},
    },
    eslintConfigPrettier,
  ]);
}

export function createDocsEslintConfig() {
  return defineConfig([
    nextEslint.configs.recommended,
    {
      name: 'Base Docs Config',
      settings: {
        next: {
          rootDir: 'docs',
        },
      },
      files: ['**/*.js', '**/*.mjs', '**/*.jsx', '**/*.ts', '**/*.tsx'],
      rules: {
        'compat/compat': 'off',
        'jsx-a11y/anchor-is-valid': 'off',
        'no-irregular-whitespace': ['error', { skipJSXText: true, skipStrings: true }],
      },
    },
    {
      name: 'Base Mdx Config',
      files: ['**/*.mdx'],
      ...mdxPlugin.flat,
      processor: mdxPlugin.createRemarkProcessor({
        lintCodeBlocks: true,
      }),
      rules: {
        ...mdxPlugin.flat.rules,
        'mdx/remark': 'error',
      },
    },
    eslintConfigPrettier,
  ]);
}
