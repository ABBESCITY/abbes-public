import { defineConfig } from '@eslint/config-helpers';

import nextEslint from '@next/eslint-plugin-next';

import * as mdxPlugin from 'eslint-plugin-mdx';

import eslintConfigPrettier from 'eslint-config-prettier/flat';

export function createDocsEslintConfig({ docsDirectory }: { docsDirectory: string }) {
  return defineConfig([
    nextEslint.configs.recommended,
    {
      name: 'Base Docs Config',
      settings: { next: { rootDir: docsDirectory } },
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
      processor: mdxPlugin.createRemarkProcessor({ lintCodeBlocks: true }),
      rules: { ...mdxPlugin.flat.rules, 'mdx/remark': 'error' },
    },
    eslintConfigPrettier,
  ]);
}
