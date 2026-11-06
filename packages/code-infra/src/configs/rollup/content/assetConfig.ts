import rollup from 'rollup';
import libraryAssets from 'rollup-plugin-library-assets';

import { createRollupExternal, createRollupInput, createRollupOutput, createRollupPlugins } from '../core';

import { merge } from '#/utils/merge';
import { createRollupMarkerPlugin } from '#/plugins/rollup/marker';

import type { ConfigContext, ConfigMeta, CreateRollupConfigOption } from '#/types/rollupConfig';

export function createAssetRollupConfig(
  configCtx: ConfigContext,
  options: CreateRollupConfigOption & { needLibraryAssetsPlugin?: boolean },
  customConfig?: rollup.RollupOptions,
): rollup.RollupOptions {
  const { outputDir, externalAdditional, needLibraryAssetsPlugin } = options;
  const { inputList, packageName, packagePath, packageJson, needSourceMap, needTerserPlugin } = configCtx;

  const configMeta: ConfigMeta = { packageName, packagePath, packageJson, bundleTypes: ['esm'], configType: 'Asset' };

  let assetRollupConfig: rollup.RollupOptions | undefined;

  const defaultConfig = {
    input: createRollupInput(configMeta, inputList),
    output: createRollupOutput(configMeta, { directory: outputDir, isAsset: true, isSourceMap: needSourceMap }),
    plugins: createRollupPlugins(configMeta, {
      needTerser: needTerserPlugin,
      hasAssets: true,
      additional: [createRollupMarkerPlugin(configMeta)],
    }),
    external: createRollupExternal(configMeta, { additional: externalAdditional }),
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
