import 'rollup';

import type { InputOptionsWithPlugins, OutputOptions, RollupOutput } from 'rollup';

export interface CreateRollupConfigOption {
  packageName: string;
  outputDir?: string;
  entryOptions?: { type: 'single' | 'multiple'; multiExclude?: string[] };
  needTerserPlugin?: boolean;
  externalAdditional?: string[];
}
