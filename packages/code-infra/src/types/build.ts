import type { BundleType, RollupConfigOptions } from './rollupConfig';
import type { ConfigMeta } from './rollupConfig';

export type JsOutputDir = { [key in BundleType]: string };

export interface RollupConfig extends ConfigMeta {
  packageConfig: Omit<RollupConfigOptions, 'packageName'>;
}

export interface OutputResult {
  outputType: 'Asset' | 'JavaScript' | 'Declaration' | 'PackageJson' | 'Other';
  bundleType?: BundleType;
  outputPath: string;
  outputTempPath: string;
}

export interface BuildContext {
  bundleTypes: BundleType[];
  workspaceRoot: string;
  baseOutputDir: string;
  packagePath: string;
  outputTempDir: string;
  outputResults: OutputResult[];
}
