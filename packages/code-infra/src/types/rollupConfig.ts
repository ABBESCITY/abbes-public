import 'rollup';

import type { InputOptions, InputOptionsWithPlugins, OutputOptions, RollupOutput } from 'rollup';

export type BundleType = 'esm' | 'cjs';

// Rollup Options
export type RollupConfigOptions = {
  packageName: string;
  configType: 'Asset' | 'Javascript';
  inputOptions: InputOptions;
  outputOptions: OutputOptions[];
};

// Create Config Options
export interface ConfigMeta {
  packageName: string;
  configType: 'Asset' | 'Javascript';
}
export interface CreateRollupConfigOption {
  packageName: string;
  outputDir?: string;
  entryOptions?: { type: 'single' | 'multiple'; multiExclude?: string[] };
  needTerserPlugin?: boolean;
  externalAdditional?: string[];
}
