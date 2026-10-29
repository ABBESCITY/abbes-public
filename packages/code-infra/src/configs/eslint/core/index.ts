import { defineConfig } from '@eslint/config-helpers';

export function createCoreConfig() {
  return defineConfig([{ name: 'Core Config', rules: { 'import/prefer-default-export': 'off' } }]);
}
