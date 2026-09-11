import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';

import { globby } from 'globby';
import { packageDirectory } from 'pkg-dir';
import { loadConfigFile } from 'rollup/loadConfigFile';

import { writePackageJson } from '../utils/packageJson';
import { generateDeclareOutput } from '../utils/typescript';
import { createBundleMapGraphs, generateBundleOutput, parseRollupOptions } from '../utils/rollup';

import {
  SOURCE_DIR,
  BUILD_TEMP_ROOT_DIR,
  BUILD_JS_TEMP_DIR,
  BUILD_ASSET_TEMP_DIR,
  BUILD_DECLARE_TEMP_DIR,
  ROLLUP_DEFAULT_OUTPUT_ROOT_DIR,
} from '../constants/config';

import { mapConcurrently, recursiveCopyFile } from '../utils/other';

import type { Argv } from 'yargs';
import type { CusGenerateOutput, HandlerFunctionArgs } from '../types/rollup';

export type BuildArgs = {
  verbose: boolean;
  createBin: boolean;
  copyFiles: string[];
  configFile: string;
  tsconfigFile: string;
};

// Command
export default {
  command: 'build',
  describe: 'Builds the package for publishing.',
  builder: (yargs: Argv) =>
    yargs
      .option('copyFiles', {
        type: 'string',
        describe: '',
      })
      .option('configFile', {
        type: 'string',
        required: true,
        describe: 'The rollup config file path for build.',
      })
      .option('tsconfigFile', {
        type: 'string',
        required: true,
        describe: 'The typescript config file path for build.',
      })
      .option('createBin', {
        type: 'boolean',
        describe: 'The package will build the bin script',
      })
      .option('verbose', {
        type: 'boolean',
        default: false,
      }),
  handler: async ({ copyFiles, configFile, tsconfigFile, createBin, verbose }: BuildArgs) => {
    const workspaceDir = (await packageDirectory({ cwd: process.cwd() })) ?? process.cwd();

    const sourceDir = path.join(workspaceDir, SOURCE_DIR);
    const buildRootDir = path.join(workspaceDir, ROLLUP_DEFAULT_OUTPUT_ROOT_DIR);
    const buildRootTempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), BUILD_TEMP_ROOT_DIR));
    const packageJsonPath = path.join(workspaceDir, 'package.json');

    // Read build from config file path
    const { options } = await loadConfigFile(configFile, {});

    // Parse the options from config file
    const optionMap = await parseRollupOptions(options);

    // Create bundle graph
    const bundleMap = await createBundleMapGraphs(Array.from(optionMap));

    // Generate the javascript files
    const jsTempDir = path.join(buildRootTempDir, BUILD_JS_TEMP_DIR);
    const jsOutputs = await generateBundleOutput({
      tempDir: jsTempDir,
      outputType: 'js',
      bundleMap: bundleMap,
      optionMap: optionMap,
    });

    // Generate the assets files
    const assetsTempDir = path.join(buildRootTempDir, BUILD_ASSET_TEMP_DIR);
    const assetOutputs = await generateBundleOutput({
      tempDir: assetsTempDir,
      outputType: 'asset',
      bundleMap: bundleMap,
      optionMap: optionMap,
    });

    // Generate the declare files
    const declareTempDir = path.join(buildRootTempDir, BUILD_DECLARE_TEMP_DIR);
    const declareOutput = await generateDeclareOutput({
      sourceDir: sourceDir,
      targetDir: declareTempDir,
      tsconfigFile: tsconfigFile,
    });

    // Copy other files which are needed by publish
    const copyOtherOutput = await copyOtherHandler({
      copyFiles,
      workspaceDir: workspaceDir,
      targetDir: buildRootDir,
      targetTempDir: buildRootTempDir,
      verbose: verbose,
    });

    // Write and copy package json into truth directory
    const packageJsonOutput = await writePackageJson({
      createBin: createBin,
      targetDir: buildRootDir,
      targetTempDir: buildRootTempDir,
      packageJsonPath: packageJsonPath,
    });

    // Move temp fils into truth directory
    await moveTempToDisk([...jsOutputs, ...assetOutputs, ...declareOutput, ...packageJsonOutput, ...copyOtherOutput]);
  },
};

async function moveTempToDisk(tempPathList: CusGenerateOutput[]) {
  await mapConcurrently(
    tempPathList,
    async ({ tempPath: sourcePath, originalPath: targetPath }) => {
      await fs.promises.mkdir(targetPath, { recursive: true });
      const entries = await fs.promises.readdir(sourcePath);
      for (const entry of entries) {
        await fs.promises.rename(path.join(sourcePath, entry), path.join(targetPath, entry));
      }
      await fs.promises.rm(sourcePath, { recursive: true, force: true });
    },
    20,
  );
}

async function copyOtherHandler({
  copyFiles,
  targetDir,
  workspaceDir,
  targetTempDir,
  verbose,
}: HandlerFunctionArgs<{
  workspaceDir: string;
  copyFiles?: string[];
  targetDir: string;
  targetTempDir: string;
}>): Promise<CusGenerateOutput[]> {
  const needCopyFiles: any[] = [];
  const defaultCopyFiles = [
    path.join(workspaceDir, 'README.md'),
    path.join(workspaceDir, 'LICENSE'),
    path.join(workspaceDir, 'CHANGELOG.md'),
  ];

  await Promise.all(
    defaultCopyFiles.map(async (fileNeedCopy) => {
      const isFileExisted = await fs.promises.stat(fileNeedCopy).then(
        () => true,
        () => false,
      );
      if (isFileExisted) needCopyFiles.push(fileNeedCopy);
    }),
  );

  if (copyFiles?.length) {
    const copyFileMap = new Map();
    const cacheResult = copyFiles.map((fullPattern) => {
      const [pattern, baseDir] = fullPattern.split(':');
      return { pattern, baseDir };
    });
    const copyResult = await Promise.all(
      cacheResult.map(async ({ pattern, baseDir }) => {
        if (!copyFileMap.has(pattern)) {
          const promise = globby(pattern, { cwd: workspaceDir });
          copyFileMap.set(pattern, promise);
        }
        const files = await copyFileMap.get(pattern);
        return { files: files ?? [], baseDir };
      }),
    );

    // Release memory early
    copyFileMap.clear();

    copyResult.forEach(({ files, baseDir }) => {
      files.forEach((file: string) => {
        needCopyFiles.push({ file, baseDir });
      });
    });
  }

  if (!needCopyFiles.length) {
    if (verbose) {
      console.log('There are no files need copy .');
    }
  }

  await mapConcurrently(
    needCopyFiles,
    async (file) => {
      if (typeof file === 'string') {
        const sourcePath = file;
        const fileName = path.basename(file);
        const targetPath = path.join(targetTempDir, fileName);
        await recursiveCopyFile({ source: sourcePath, target: targetPath, verbose });
      } else {
        const sourcePath = path.join(workspaceDir, file.file);
        const targetPath = path.join(targetTempDir, file.baseDir, file.file);
        await recursiveCopyFile({ source: sourcePath, target: targetPath, verbose });
      }
    },
    20,
  );

  return [
    {
      tempPath: targetTempDir,
      originalPath: targetDir,
    },
  ];
}
