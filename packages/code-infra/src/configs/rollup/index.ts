import rollup from 'rollup';

import { getPackagePath } from '#/utils/path';
import { createBaseRollupConfig } from './content/baseConfig';
import { createAssetRollupConfig } from './content/assetConfig';

import type { BundleType, ConfigContext, ConfigMeta } from '#/types/rollupConfig';
import { getInputByPackageJson, readValidatePackageJson } from '#/utils/build/packageJson';
import { PackageJson } from 'type-fest';

interface ConfigOption {
  rollupConfig: rollup.RollupOptions;
}

interface JsConfigOptions extends ConfigOption {
  outputDir?: string;
  externalAdditional?: string[];
}

interface AssetConfigOptions extends JsConfigOptions {
  needLibraryAssetsPlugin?: boolean;
}

export interface CreateRollupConfigOptions {
  packageName: string;
  bundleTypes?: BundleType[];
  needSourceMap?: boolean;
  needTerserPlugin?: boolean;
  jsConfigOptions?: JsConfigOptions;
  assetConfigOptions?: AssetConfigOptions;
}

export function createRollupConfig({
  packageName,
  bundleTypes = ['esm'],
  needSourceMap = false,
  needTerserPlugin = false,
  jsConfigOptions,
  assetConfigOptions,
}: CreateRollupConfigOptions) {
  const packagePath = getPackagePath(packageName);
  const { packageJson, valid, errors } = readValidatePackageJson(packagePath);

  if (!valid) {
    throw new Error(`Validate package.json failed. errors: ${errors[0]}`);
  }

  const configContext: ConfigContext = {
    inputList: getInputByPackageJson(packageJson as PackageJson),
    packageName,
    packagePath,
    packageJson: packageJson as PackageJson,
    bundleTypes,
    needSourceMap,
    needTerserPlugin,
  };

  const rollupConfig = [
    createBaseRollupConfig(
      configContext,
      { outputDir: jsConfigOptions?.outputDir, externalAdditional: jsConfigOptions?.externalAdditional },
      jsConfigOptions?.rollupConfig,
    ),
  ];

  if (assetConfigOptions) {
    rollupConfig.push(
      createAssetRollupConfig(
        configContext,
        {
          outputDir: assetConfigOptions.outputDir,
          externalAdditional: jsConfigOptions?.externalAdditional,
          needLibraryAssetsPlugin: assetConfigOptions.needLibraryAssetsPlugin,
        },
        assetConfigOptions.rollupConfig,
      ),
    );
  }

  return rollupConfig;
}
