import { BundleType } from './rollupConfig';

export interface ValidatedPackageJson {
  valid: boolean;
  errors?: string[];
}

export interface PackageOutputDir {
  jsDir?: string;
  declareDir?: string;
}
