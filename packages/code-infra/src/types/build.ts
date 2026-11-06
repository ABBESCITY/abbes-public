import type { PackageJson } from 'type-fest';
import type { BundleType, RollupConfigOptions } from './rollupConfig';

export type JsOutputDir = { [key in BundleType]: string };

export type RollupConfig = {
  packageName: string;
  packagePath: string;
  packageJson: PackageJson;
  packageBundleTypes: BundleType[];
  packageConfig: Omit<RollupConfigOptions, 'packageName'>[];
};

export interface OutputResult {
  outputType: 'Assets' | 'Javascript' | 'Declare';
  bundleType?: BundleType;
  outputPath: string;
  outputTemPath: string;
}

export interface BuildContext {
  bundleType: BundleType[];
  workspaceRoot: string;
  workspaceDir: string;
  baseOutputTempDir: string;
  jsOutputDir?: JsOutputDir;
  assetsOutputDir?: string;
  declareOutputDir?: string;
}
