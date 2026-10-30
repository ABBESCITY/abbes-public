import rollup from 'rollup';
import libraryAssets from 'rollup-plugin-library-assets';

import { createRollupExternal, createRollupInput, createRollupOutput, createRollupPlugins } from '../core';

import { merge } from '@/utils/merge';
import { getPackageRelativePath } from '@/utils/path';
import { createRollupMarkerPlugin } from '@/plugins/rollup/marker';

import type { CreateRollupConfigOption } from '@/types/rollupConfig';

export function createAssetRollupConfig(
  options: CreateRollupConfigOption & { needLibraryAssetsPlugin?: boolean },
  customConfig?: rollup.RollupOptions,
): rollup.RollupOptions {
  const { packageName, outputDir, entryOptions, externalAdditional, needTerserPlugin, needLibraryAssetsPlugin } =
    options;

  const packagePath = getPackageRelativePath(packageName);
  const markPlugin = createRollupMarkerPlugin({ packageName, configType: 'Asset' });

  let assetRollupConfig: rollup.RollupOptions | undefined;

  const defaultConfig = {
    input: createRollupInput({
      packagePath: packagePath,
      entryType: entryOptions?.type,
      multiExclude: entryOptions?.multiExclude,
    }),
    output: createRollupOutput({ packagePath: packagePath, directory: outputDir }),
    plugins: createRollupPlugins({ needTerser: needTerserPlugin ?? false, hasAssets: true, additional: [markPlugin] }),
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
