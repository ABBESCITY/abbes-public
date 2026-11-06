import 'rollup';

import type { InputOptions, OutputOptions } from 'rollup';
import type { PackageJson } from 'type-fest';

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
  packagePath: string;
  packageJson: PackageJson;
  bundleTypes: BundleType[];
  configType: 'Asset' | 'Javascript';
}
export interface ConfigContext extends Omit<ConfigMeta, 'configType'> {
  inputList: Record<string, string>;
  needSourceMap?: boolean;
  needTerserPlugin?: boolean;
}

export interface CreateRollupConfigOption {
  outputDir?: string;
  externalAdditional?: string[];
}
