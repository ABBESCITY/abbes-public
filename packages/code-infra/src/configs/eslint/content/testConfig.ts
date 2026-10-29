import { defineConfig } from '@eslint/config-helpers';

import vitestPlugin from '@vitest/eslint-plugin';

import testingLibrary from 'eslint-plugin-testing-library';
import { EXTENSION_SPEC_TEST_FILE } from '../../../constants/extension';

export function createTestEslintConfig({ useReactFrame = true }: { useReactFrame: boolean }) {
  return defineConfig([
    vitestPlugin.configs.recommended,
    useReactFrame ? testingLibrary.configs['flat/react'] : testingLibrary.configs['flat/dom'],
    { name: 'Common Test file Config', rules: { 'react/button-has-type': 'off' } },
  ]);
}

export function createSpecEslintConfig({ baseDirectory }: { baseDirectory?: string }) {
  const relativePath = baseDirectory ? baseDirectory + '/' : '';

  return defineConfig([
    {
      name: 'Spec Test Config',
      files: [`${relativePath}**/${EXTENSION_SPEC_TEST_FILE}`],
      rules: {
        'no-alert': 'off',
        'no-console': 'off',
        'no-empty-pattern': 'off',
        'no-lone-blocks': 'off',
        'no-shadow': 'off',

        // Handle any typescript
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
        '@typescript-eslint/no-unsafe-argument': 'off',
      },
    },
  ]);
}
