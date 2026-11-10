import rollup from 'rollup';

import { createRollupExternal, createRollupInput, createRollupOutput, createRollupPlugins } from '../core';

import { merge } from '#/utils/merge';
import { createRollupMarkerPlugin } from '#/plugins/rollup/marker';

import type { ConfigContext, ConfigMeta } from '#/types/rollupConfig';

export function createBaseRollupConfig(
  configCtx: ConfigContext,
  externalAdditional?: string[],
  customConfig?: rollup.RollupOptions,
): rollup.RollupOptions {
  const { bundleTypes, packageName, packagePath, packageJson, needSourceMap, needTerserPlugin, outputDir, hasAssets } =
    configCtx;

  const defaultConfig = {
    input: createRollupInput(configCtx),
    output: createRollupOutput(configCtx, { isSourceMap: needSourceMap }),
    plugins: createRollupPlugins(configCtx, {
      needTerser: needTerserPlugin,
      additional: [
        createRollupMarkerPlugin({
          packageName,
          packagePath,
          packageJson,
          bundleTypes,
          hasAssets,
          outputDir,
        } as ConfigMeta),
      ],
    }),
    external: createRollupExternal(configCtx, { additional: externalAdditional }),
  };
  if (customConfig) return merge(customConfig, defaultConfig);
  return defaultConfig;
}
