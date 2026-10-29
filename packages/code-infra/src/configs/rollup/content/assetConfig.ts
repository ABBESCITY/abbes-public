import rollup from 'rollup';
import libraryAssets from 'rollup-plugin-library-assets';

import { createRollupExternal, createRollupInput, createRollupOutput, createRollupPlugins } from '../core';

import { merge } from '@/utils/merge';
import { getPackageRelativePath } from '@/utils/path';

import type { CreateRollupConfigOption } from '@/types/cusRollupConfig';

export function createAssetRollupConfig(
  options: CreateRollupConfigOption & { needLibraryAssetsPlugin?: boolean },
  customConfig?: rollup.RollupOptions,
): rollup.RollupOptions {
  const { packageName, outputDir, entryOptions, externalAdditional, needTerserPlugin, needLibraryAssetsPlugin } =
    options;

  const packagePath = getPackageRelativePath(packageName);

  let assetRollupConfig: rollup.RollupOptions | undefined;

  const defaultConfig = {
    packageName: packageName,
    outputType: 'Asset',
    input: createRollupInput({
      packagePath: packagePath,
      entryType: entryOptions?.type,
      multiExclude: entryOptions?.multiExclude,
    }),
    output: createRollupOutput({ packagePath: packagePath, directory: outputDir }),
    plugins: createRollupPlugins({ needTerser: needTerserPlugin ?? false, hasAssets: true }),
    external: createRollupExternal({ packagePath: packagePath, additional: externalAdditional }),
  };

  if (customConfig) {
    assetRollupConfig = merge(customConfig, defaultConfig);
    if (assetRollupConfig.plugins && needLibraryAssetsPlugin) {
      (assetRollupConfig.plugins as rollup.InputPluginOption[]).push(libraryAssets());
    }
    return assetRollupConfig;
  }

  return defaultConfig;
}
