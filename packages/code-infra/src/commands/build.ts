import { loadConfigFile } from 'rollup/loadConfigFile';

import { generateDeclareOutput } from '../utils/typescript';
import { createChunkGraphs, generateAssetsOutput, generateJsOutput, parseRollupOptions } from '../utils/rollup';

import type { Argv } from 'yargs';

export type BuildArgs = {
  configFile: string;
};

// Command
export default {
  command: 'build',
  describe: 'Builds the package for publishing.',
  builder: (yargs: Argv) =>
    yargs.option('configFile', {
      type: 'string',
      required: true,
      describe: 'The rollup config file path for build',
    }),
  handler: async ({ configFile }: BuildArgs) => {
    // Read build from config file path
    const { options, warnings } = await loadConfigFile(configFile, {});

    // Parse the options from config file
    const optionMap = await parseRollupOptions(options);

    // Create chunk graph
    const chunkMap = await createChunkGraphs(Array.from(optionMap));

    // Generate the javascript files
    await generateJsOutput(chunkMap);

    // Generate the assets files
    await generateAssetsOutput(chunkMap);

    // Generate the declare files
    await generateDeclareOutput();
  },
};
