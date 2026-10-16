import path from 'node:path';
import globals from 'globals';
import { defineConfig } from '@eslint/config-helpers';

import eslintJs from '@eslint/js';
import eslintJson from '@eslint/json';
import eslintMarkdown from '@eslint/markdown';
import tseslint from 'typescript-eslint';
import reactPlugin from '@eslint-react/eslint-plugin';

import compatPlugin from 'eslint-plugin-compat';
import importPlugin from 'eslint-plugin-import';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

import { includeIgnoreIfExists } from '../utils';
import { EXTENSION_JS, EXTENSION_TS } from '../../../constants/extension';

export function createBaseEslintConfig({ baseDirectory = process.cwd() }: { baseDirectory: string }) {
  return defineConfig([
    includeIgnoreIfExists(path.join(baseDirectory, '.gitignore'), 'Ignore the .gitignore'),
    {
      name: 'Common Base Eslint Config',
      languageOptions: {
        ecmaVersion: 2025,
        sourceType: 'module',
        globals: { ...globals.es2025, ...globals.browser, ...globals.node },
        parserOptions: { projectService: true, tsconfigRootDir: baseDirectory },
      },
      settings: {
        react: {
          // The reactPlugin incompatible the Eslint v10 for auto detect react version. so need fixed the react version
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
      files: [`**/*.{${EXTENSION_JS},${EXTENSION_TS}}`],
      extends: [
        eslintJs.configs.recommended,
        tseslint.configs.recommended,
        reactPlugin.configs['recommended-typescript'],
        reactHooksPlugin.configs.flat.recommended,
        jsxA11yPlugin.flatConfigs.recommended,
        importPlugin.flatConfigs.recommended,
        importPlugin.flatConfigs.react,
        importPlugin.flatConfigs.typescript,
        compatPlugin.configs['flat/recommended'],
      ],
    },
    eslintConfigPrettier,
  ]);
}

export function createJsonEslintConfig({ baseDirectory }: { baseDirectory: string }) {
  return defineConfig([
    {
      name: 'Base Json Config',
      files: ['**/*.json'],
      language: 'json/json',
      extends: [eslintJson.configs.recommended],
      rules: { 'json/no-duplicate-keys': 'error' },
    },
    { files: ['**/*.jsonc', '.vscode/*.json'], language: 'json/jsonc', rules: { 'json/no-duplicate-keys': 'error' } },
    { files: ['**/*.json5'], language: 'json/json5', rules: { 'json/no-duplicate-keys': 'error' } },
  ]);
}

export function createMdEslintConfig({ baseDirectory }: { baseDirectory?: string }) {
  const relativePath = baseDirectory ? baseDirectory + '/' : '';

  return defineConfig([
    {
      name: 'Base Markdown Config',
      files: [`${relativePath}/**/*.md`],
      language: 'markdown/commonmark',
      extends: [eslintMarkdown.configs.recommended],
    },
  ]);
}
