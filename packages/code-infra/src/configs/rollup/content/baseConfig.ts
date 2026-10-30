import rollup from 'rollup';

import { createRollupExternal, createRollupInput, createRollupOutput, createRollupPlugins } from '../core';

import { merge } from '@/utils/merge';
import { getPackageRelativePath } from '@/utils/path';
import { createRollupMarkerPlugin } from '@/plugins/rollup/marker';

import type { CreateRollupConfigOption } from '@/types/rollupConfig';

export function createBaseRollupConfig(
  options: CreateRollupConfigOption,
  customConfig?: rollup.RollupOptions,
): rollup.RollupOptions {
  const { packageName, outputDir, needTerserPlugin, externalAdditional, entryOptions } = options;

  const packagePath = getPackageRelativePath(packageName);
  const markPlugin = createRollupMarkerPlugin({ packageName, configType: 'Javascript' });

  const defaultConfig = {
    input: createRollupInput({
      packagePath: packagePath,
      entryType: entryOptions?.type,
      multiExclude: entryOptions?.multiExclude,
    }),
    output: createRollupOutput({ packagePath: packagePath, directory: outputDir }),
    plugins: createRollupPlugins({ needTerser: needTerserPlugin ?? false, hasAssets: false, additional: [markPlugin] }),
    external: createRollupExternal({ packagePath: packagePath, additional: externalAdditional }),
  };

  if (customConfig) return merge(customConfig, defaultConfig);

  return defaultConfig;
}
