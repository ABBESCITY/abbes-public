import path from 'node:path';
import { findWorkspaceDir } from '@pnpm/find-workspace-dir';

import { loadTsConfig, runDeclare } from '#/utils/build/typescript';
import { copyNeedFiles } from '#/utils/build/copy';
import { recursiveCopy } from '#/utils/other';
import { rewritePackageJson } from '#/utils/build/packageJson';
import { loadRollupConfig, runRollup } from '#/utils/build/rollup';
import { ROLLUP_CONFIG_FILE, TS_BUILD_CONFIG_FILE } from '#/constants/config';

import type { CommandModule } from 'yargs';
import type { BuildContext, OutputResult } from '#/types/build';
import { createBuildTempDir } from '#/utils/path';

interface BuildArguments {
  config?: string;
  copy?: string[];
}

export default {
  command: 'build',
  describe: 'Build the current project with Rollup',
  builder: (yargs) =>
    yargs
      .option('config', {
        type: 'string',
        describe: 'Path to the Rollup configuration file',
        default: ROLLUP_CONFIG_FILE,
      })
      .option('copy', { type: 'string', describe: 'Files to copy into the build output', array: true }),
  handler: async ({ config, copy }: BuildArguments) => {
    const rollupConfigs = await loadRollupConfig(config || ROLLUP_CONFIG_FILE);
    const buildTempDir = await createBuildTempDir('abbes-build-temp');

    const workspaceRoot = await findWorkspaceDir(process.cwd());
    if (!workspaceRoot) {
      throw new Error('Workspace directory not found');
    }

    // Output results for each package, keyed by package name
    const buildResults: Record<string, OutputResult[]> = {};

    for (const [packageName, rollupConfig] of Object.entries(rollupConfigs)) {
      const workspaceDir = rollupConfig.packagePath;
      const workspacePackageJson = rollupConfig.packageJson;
      const tsConfigPath = path.join(workspaceDir, TS_BUILD_CONFIG_FILE);
      const baseOutputTempDir = path.resolve(buildTempDir, packageName);

      // Need read config
      const results: OutputResult[] = [];
      const buildContext: BuildContext = {
        workspaceRoot,
        workspaceDir,
        baseOutputTempDir,
        bundleType: rollupConfig.packageBundleTypes,
      };

      // Build Javascript and Assets
      const { js, assets } = await runRollup(rollupConfig, baseOutputTempDir);
      buildContext.jsOutputDir = Object.fromEntries(
        js.map((result) => [result.bundleType!, result.outputPath]),
      ) as BuildContext['jsOutputDir'];
      if (assets.length > 0) {
        buildContext.assetsOutputDir = assets[0].outputPath;
      }
      results.push(...js, ...assets);

      // Build Declare
      const tsOptions = await loadTsConfig(tsConfigPath);
      const declareResults = await runDeclare(tsOptions, baseOutputTempDir);
      buildContext.declareOutputDir = declareResults.outputPath;
      results.push(declareResults);

      // Rewrite Package.json
      if (buildContext.declareOutputDir && buildContext.jsOutputDir) {
        await rewritePackageJson(workspacePackageJson, baseOutputTempDir, buildContext);
      }

      // Copy need files
      await copyNeedFiles(copy ?? [], buildContext);
      buildResults[packageName] = results;
    }

    // Commit output
    // Object.entries(buildResults).forEach(([packageName, results]) => {
    //   results.forEach((result) => {
    //     recursiveCopy(result.outputTemPath, result.outputPath);
    //   });
    // });
  },
} satisfies CommandModule<{}, BuildArguments>;
