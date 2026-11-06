import rollup from 'rollup';

import { createRollupExternal, createRollupInput, createRollupOutput, createRollupPlugins } from '../core';

import { merge } from '#/utils/merge';
import { createRollupMarkerPlugin } from '#/plugins/rollup/marker';

import type { ConfigContext, ConfigMeta, CreateRollupConfigOption } from '#/types/rollupConfig';

export function createBaseRollupConfig(
  configCtx: ConfigContext,
  options: CreateRollupConfigOption,
  customConfig?: rollup.RollupOptions,
): rollup.RollupOptions {
  const { outputDir, externalAdditional } = options;
  const { inputList, bundleTypes, packageName, packagePath, packageJson, needSourceMap, needTerserPlugin } = configCtx;

  const configMeta: ConfigMeta = {
    packageName,
    packagePath,
    packageJson,
    bundleTypes: bundleTypes,
    configType: 'Javascript',
  };

  const defaultConfig = {
    input: createRollupInput(configMeta, inputList),
    output: createRollupOutput(configMeta, { directory: outputDir, isSourceMap: needSourceMap }),
    plugins: createRollupPlugins(configMeta, {
      needTerser: needTerserPlugin,
      hasAssets: false,
      additional: [createRollupMarkerPlugin(configMeta)],
    }),
    external: createRollupExternal(configMeta, { additional: externalAdditional }),
  };

  if (customConfig) return merge(customConfig, defaultConfig);

  return defaultConfig;
}
