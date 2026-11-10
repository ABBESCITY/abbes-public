import path from 'node:path';
import { findWorkspaceDir } from '@pnpm/find-workspace-dir';

import { recursiveCopy } from '#/utils/other';
import { copyNeedFiles } from '#/utils/build/copy';
import { createBuildTempDir } from '#/utils/path';
import { rewritePackageJson } from '#/utils/build/packageJson';
import { loadTsConfig, runDeclare } from '#/utils/build/typescript';
import { loadRollupConfig, runRollup } from '#/utils/build/rollup';

import { ROLLUP_CONFIG_FILE, TS_BUILD_CONFIG_FILE } from '#/constants/config';

import type { CommandModule } from 'yargs';
import type { BuildContext, OutputResult } from '#/types/build';

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
    const buildTempDir = await createBuildTempDir('abbes-build-temp');
    const workspaceRoot = await findWorkspaceDir(process.cwd());
    if (!workspaceRoot) {
      throw new Error('Workspace directory not found');
    }

    // Load Rollup configuration for the workspace
    const rollupConfigs = await loadRollupConfig(config || ROLLUP_CONFIG_FILE);

    // Output results for each package, keyed by package name
    const buildResults: Record<string, OutputResult[]> = {};

    for (const [packageName, rollupConfig] of Object.entries(rollupConfigs)) {
      const { packagePath, packageJson, bundleTypes, outputDir } = rollupConfig;

      const tsConfigPath = path.join(rollupConfig.packagePath, TS_BUILD_CONFIG_FILE);
      const outputTempDir = path.resolve(buildTempDir, packageName);

      const buildContext: BuildContext = {
        bundleTypes,
        workspaceRoot,
        packagePath,
        baseOutputDir: outputDir.base,
        outputTempDir,
        outputResults: [],
      };

      // Build Javascript and Assets
      await runRollup(rollupConfig, buildContext);

      // Build Declare
      const tsOptions = await loadTsConfig(tsConfigPath);
      await runDeclare(tsOptions, buildContext);

      // Rewrite Package.json
      await rewritePackageJson(packageJson, buildContext);

      // Copy need files
      await copyNeedFiles(copy ?? [], buildContext);
      buildResults[packageName] = buildContext.outputResults;
    }

    console.log(buildResults);

    // Commit output
    Object.entries(buildResults).forEach(([_packageName, results]) => {
      results.forEach((result) => {
        recursiveCopy(result.outputTempPath, result.outputPath);
      });
    });
  },
} satisfies CommandModule<{}, BuildArguments>;
