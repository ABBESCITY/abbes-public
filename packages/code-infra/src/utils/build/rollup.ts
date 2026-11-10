import path from 'node:path';

import { rollup } from 'rollup';
import { loadConfigFile } from 'rollup/loadConfigFile';

import { findRollupMarkerPluginData } from '#/plugins/rollup/marker';

import type { BuildContext, OutputResult, RollupConfig } from '#/types/build';
import type { ConfigMeta } from '#/types/rollupConfig';
import type { OutputOptions, RollupBuild } from 'rollup';

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
      const { packageName, packagePath, packageJson, bundleTypes, outputDir, hasAssets } = configMeta;

      if (!configs[packageName]) {
        configs[packageName] = {
          packageName: packageName,
          packagePath: packagePath,
          packageJson: packageJson,
          bundleTypes: bundleTypes,
          outputDir: outputDir,
          hasAssets: hasAssets,
          packageConfig: { inputOptions, outputOptions: output },
        };
      }
      return configs;
    },
    {} as Record<string, RollupConfig>,
  );
}

/** Write a Rollup bundle once for each configured output. */
export async function genOutputByBundle(
  bundle: RollupBuild,
  outputOptions: OutputOptions[],
  baseOutputTempDir: string,
) {
  await Promise.all(
    outputOptions.map(async (option) => {
      await bundle.write({ ...option, dir: baseOutputTempDir });
    }),
  );
}

/** Build Rollup configs and write their outputs under the temporary build directory. */
export async function runRollup(rollupConfig: RollupConfig, buildCtx: BuildContext) {
  let jsResult: OutputResult;
  const config = rollupConfig.packageConfig;

  const hasAssets = rollupConfig.hasAssets;
  const buildTempDir = buildCtx.outputTempDir;
  const outputPathJs = path.resolve(buildCtx.baseOutputDir, rollupConfig.outputDir.js);
  const outputPathAssets = path.resolve(buildCtx.baseOutputDir, rollupConfig.outputDir.asset);
  const baseOutputTempDir = path.resolve(buildTempDir);

  // Create a Rollup bundle with the input options
  const bundle = await rollup(config.inputOptions);

  try {
    await genOutputByBundle(bundle, config.outputOptions, baseOutputTempDir);
    jsResult = {
      outputType: 'JavaScript',
      outputPath: outputPathJs,
      outputTempPath: path.resolve(baseOutputTempDir, rollupConfig.outputDir.js),
    };
  } finally {
    await bundle.close();
  }

  buildCtx.outputResults.push(jsResult);

  if (hasAssets) {
    buildCtx.outputResults.push({
      outputType: 'Asset',
      outputPath: outputPathAssets,
      outputTempPath: path.resolve(baseOutputTempDir, rollupConfig.outputDir.asset),
    });
  }
}
