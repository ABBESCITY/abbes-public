import type { Config } from 'prettier';
import { mergeConfig } from '../utils/other';

export function createBasePrettierConfig(customConfig: Config = {}): Config {
  return mergeConfig(customConfig, {
    semi: true,
    tabWidth: 2,
    singleQuote: true,
    trailingComma: 'all',
    printWidth: 120,
    arrowParens: 'always',
    quoteProps: 'as-needed',
    objectWrap: 'collapse',
    ...customConfig,
  }) as Config;
}
