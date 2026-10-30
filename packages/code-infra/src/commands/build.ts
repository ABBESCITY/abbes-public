import { ROLLUP_CONFIG_FILE, TS_CONFIG_FILE } from '../constants/config';

import type { CommandModule } from 'yargs';

interface BuildArguments {
  config?: string;
  tsConfig?: string;
  copy?: string[];
}

const buildCommand: CommandModule<{}, BuildArguments> = {
  command: 'build',
  describe: 'Build the current project with Rollup',
  builder: (yargs) =>
    yargs
      .option('config', {
        alias: 'c',
        type: 'string',
        describe: 'Path to the Rollup configuration file',
        default: ROLLUP_CONFIG_FILE,
      })
      .option('tsConfig', {
        type: 'string',
        describe: 'Path to the TypeScript configuration file',
        default: TS_CONFIG_FILE,
      })
      .option('copy', { type: 'string', array: true, describe: 'Files to copy into the build output' }),
  handler: async () => {},
};

export default buildCommand;
