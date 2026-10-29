import { mergeConfig } from '../utils/other';

import type { Config } from 'stylelint';

export function createStylelintConfig(customConfig: Config = {}): Config {
  return mergeConfig(customConfig, {
    extends: ['stylelint-config-standard', 'stylelint-config-standard-scss'],
    rules: {
      // Prettier consistent
      'color-named': 'never',
      'color-hex-length': 'long',
      'alpha-value-notation': 'percentage',
      'media-feature-range-notation': 'context',
      'declaration-property-value-no-unknown': true,
      'at-rule-empty-line-before': null,
      'comment-empty-line-before': null,
      'custom-property-empty-line-before': null,
      'declaration-empty-line-before': null,
      'rule-empty-line-before': null,

      // Scalability
      'declaration-no-important': true,
      'no-descending-specificity': null,
    },
  });
}
