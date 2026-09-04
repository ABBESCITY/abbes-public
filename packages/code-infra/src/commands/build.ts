import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';

import { loadConfigFile } from 'rollup/loadConfigFile';

import { generateDeclareOutput } from '../utils/typescript';
import { createBundleMapGraphs, generateRollupOutput, parseRollupOptions, writeOutputsToDist } from '../utils/rollup';

import type { Argv } from 'yargs';
import { BUILD_TEMP_DIR } from '../constants/config';

export type BuildArgs = {
  verbose: boolean;
  configFile: string;
  tsConfigFile: string;
};

// Command
export default {
  command: 'build',
  describe: 'Builds the package for publishing.',
  builder: (yargs: Argv) =>
    yargs
      .option('configFile', {
        type: 'string',
        required: true,
        describe: 'The rollup config file path for build',
      })
      .option('tsConfigFile', {
        type: 'string',
        required: true,
        describe: 'The typescript config file path for build',
      })
      .option('verbose', {
        type: 'boolean',
        default: false,
      }),
  handler: async ({ configFile, tsConfigFile, verbose }: BuildArgs) => {
    const buildTempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), BUILD_TEMP_DIR));

    // Read build from config file path
    const { options } = await loadConfigFile(configFile, {});

    // Parse the options from config file
    const optionMap = await parseRollupOptions(options);

    // Create bundle graph
    const bundleMap = await createBundleMapGraphs(Array.from(optionMap));

    // Generate the javascript files
    const jsOutputs = await generateRollupOutput(bundleMap, optionMap, 'js');

    // Generate the assets files
    const assetOutputs = await generateRollupOutput(bundleMap, optionMap, 'asset');

    // Generate the declare files
    const declareOutputs = await generateDeclareOutput(tsConfigFile, { buildTempDir: buildTempDir });

    // Write outputs into disk
    await writeOutputsToDist([...jsOutputs, ...assetOutputs], { verbose: verbose });
  },
};
