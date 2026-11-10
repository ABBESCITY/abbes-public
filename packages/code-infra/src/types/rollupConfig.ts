import 'rollup';

import type { InputOptions, OutputOptions } from 'rollup';
import type { PackageJson } from 'type-fest';

export type BundleType = 'esm' | 'cjs';

// Rollup Options
export type RollupConfigOptions = { packageName: string; inputOptions: InputOptions; outputOptions: OutputOptions[] };

// Create Config Options
export interface ConfigMeta {
  packageName: string;
  packagePath: string;
  packageJson: PackageJson;
  bundleTypes: BundleType[];
  outputDir: { base: string; asset: string; js: string };
  hasAssets: boolean;
}
export interface ConfigContext extends ConfigMeta {
  inputType: 'single' | 'multiple';
  needSourceMap?: boolean;
  needTerserPlugin?: boolean;
}
