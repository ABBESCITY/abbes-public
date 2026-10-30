import path from 'node:path';

import { rollup } from 'rollup';
import { loadConfigFile } from 'rollup/loadConfigFile';

import { findRollupMarkerPluginData } from '@/plugins/rollup/marker';

import type { OutputResult } from '@/types/build';
import type { ConfigMeta, RollupConfigOptions } from '@/types/rollupConfig';
import type { OutputOptions, RollupBuild } from 'rollup';

/** Load and normalize a Rollup config file, using its marker plugin metadata. */
export async function loadRollupConfig(configPath: string): Promise<Record<string, RollupConfigOptions[]>> {
  const { options: loadedOptions } = await loadConfigFile(configPath, {});
  const options = Array.isArray(loadedOptions) ? loadedOptions : [loadedOptions];

  return options.reduce<Record<string, RollupConfigOptions[]>>((configs, config) => {
    const meta = findRollupMarkerPluginData<ConfigMeta>(config.plugins ?? []);

    if (!meta) {
      throw new Error(`Rollup config in "${configPath}" is missing its config marker plugin.`);
    }

    const { output, ...inputOptions } = config;

    const packageConfigs = configs[meta.packageName] ?? (configs[meta.packageName] = []);

    packageConfigs.push({
      ...meta,
      inputOptions,
      outputOptions: output ? (Array.isArray(output) ? output : [output]) : [],
    });

    return configs;
  }, {});
}

/** Build Rollup configs and write their outputs under the temporary build directory. */
export async function runRollup(configs: RollupConfigOptions[], buildTempDir: string): Promise<OutputResult[]> {
  const outputResults: OutputResult[] = [];

  for (const config of configs) {
    const baseOutputTempDir = path.resolve(buildTempDir, config.packageName, config.configType);
    const bundle = await rollup(config.inputOptions);
    try {
      outputResults.push(...(await genOutputByBundle(bundle, config.outputOptions, baseOutputTempDir)));
    } finally {
      await bundle.close();
    }
  }
  return outputResults;
}

/** Write a Rollup bundle once for each configured output. */
export function genOutputByBundle(
  bundle: RollupBuild,
  outputOptions: OutputOptions[],
  baseOutputTempDir: string,
): Promise<OutputResult[]> {
  return Promise.all(
    outputOptions.map(async (option, index) => {
      const outputDir = option.dir as string;
      const outputTempDir = path.resolve(baseOutputTempDir, index.toString());
      const tempOutputOptions = { ...option, dir: outputTempDir };

      await bundle.write(tempOutputOptions);

      return { outputDir, outputTemDir: outputTempDir };
    }),
  );
}
