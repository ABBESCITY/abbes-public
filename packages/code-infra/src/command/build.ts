import type { Argv } from 'yargs';

export type BuildArgs = {
  packageEntry?: string;
  packageSplit?: boolean;
};

// Command
export default {
  command: 'build',
  describe: 'Builds the package for publishing.',
  builder: (yargs: Argv) =>
    yargs
      .option('packageEntry', {
        type: 'string',
        describe: 'Package entry file.',
      })
      .option('packageSplit', {
        type: 'boolean',
        describe: 'Whether to split the package output.',
      }),
  handler: async ({ packageEntry, packageSplit }: BuildArgs) => {},
};
