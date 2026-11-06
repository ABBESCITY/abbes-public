import path from 'node:path';

import { rollup } from 'rollup';
import { isSubset } from 'es-toolkit/array';
import { loadConfigFile } from 'rollup/loadConfigFile';

import { findRollupMarkerPluginData } from '#/plugins/rollup/marker';

import type { OutputResult, RollupConfig } from '#/types/build';
import type { BundleType, ConfigMeta } from '#/types/rollupConfig';
import type { OutputOptions, RollupBuild } from 'rollup';
import { BUNDLE_TYPE_EXPORT_MAP } from './packageJson';

/** Load and normalize a Rollup config file, using its marker plugin metadata. */
export async function loadRollupConfig(configPath: string): Promise<Record<string, RollupConfig>> {
  const { options: loadedOptions } = await loadConfigFile(configPath, {});
  const options = Array.isArray(loadedOptions) ? loadedOptions : [loadedOptions];

  return options.reduce<Record<string, RollupConfig>>(
    (configs, config) => {
      const configMeta = findRollupMarkerPluginData<ConfigMeta>(config.plugins ?? []);

      if (!configMeta) {
        throw new Error(`Rollup config in "${configPath}" is missing its config marker plugin.`);
      }

      const { output, ...inputOptions } = config;
      const { packageName, packagePath, packageJson, bundleTypes, ...restMeta } = configMeta;

      if (!configs[packageName]) {
        configs[packageName] = {
          packageName: packageName,
          packagePath: packagePath,
          packageJson: packageJson,
          packageBundleTypes: [],
          packageConfig: [],
        };
      }

      configs[packageName].packageBundleTypes = isSubset(
        configs[packageName].packageBundleTypes ?? [],
        bundleTypes ?? [],
      )
        ? configs[packageName].packageBundleTypes
        : bundleTypes;
      configs[packageName].packageConfig.push({
        ...restMeta,
        inputOptions,
        outputOptions: output ? (Array.isArray(output) ? output : [output]) : [],
      });

      return configs;
    },
    {} as Record<string, RollupConfig>,
  );
}

/** Write a Rollup bundle once for each configured output. */
export function genOutputByBundle(
  bundle: RollupBuild,
  outputOptions: OutputOptions[],
  baseOutputTempDir: string,
  outputType: 'Asset' | 'Javascript',
): Promise<OutputResult[]> {
  return Promise.all(
    outputOptions.map(async (option, index) => {
      const outputPath = option.dir as string;
      const outputTempDir = path.resolve(baseOutputTempDir, index.toString());
      const tempOutputOptions = { ...option, dir: outputTempDir };

      await bundle.write(tempOutputOptions);

      console.log(outputTempDir);

      const outputResult = { outputType, outputPath, outputTemPath: outputTempDir } as OutputResult;

      if (option.format && Object.keys(BUNDLE_TYPE_EXPORT_MAP).includes(option.format)) {
        outputResult.bundleType = option.format as BundleType;
      }

      return outputResult;
    }),
  );
}

/** Build Rollup configs and write their outputs under the temporary build directory. */
export async function runRollup(
  rollupConfig: RollupConfig,
  buildTempDir: string,
): Promise<{ js: OutputResult[]; assets: OutputResult[] }> {
  const js: OutputResult[] = [];
  const assets: OutputResult[] = [];

  for (const config of rollupConfig.packageConfig) {
    const baseOutputTempDir = path.resolve(buildTempDir, config.configType);
    const bundle = await rollup(config.inputOptions);

    for (const plugin of config.inputOptions.plugins as any) {
      console.log(plugin.name);
    }

    try {
      const outputResults = await genOutputByBundle(bundle, config.outputOptions, baseOutputTempDir, config.configType);
      (config.configType === 'Asset' ? assets : js).push(...outputResults);
    } finally {
      await bundle.close();
    }
  }

  return { js, assets };
}
