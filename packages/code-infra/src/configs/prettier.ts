import { merge } from '@/utils/merge';

import type { Config } from 'prettier';

export function createBasePrettierConfig(customConfig: Config = {}): Config {
  return merge(customConfig, {
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
