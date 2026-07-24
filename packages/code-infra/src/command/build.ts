export default {
  command: 'build',
  describe: 'Builds the package for publishing.',
  builder: (yargs: any) =>
    yargs.option('hasLargeFiles', {
      type: 'boolean',
      default: false,
      describe: 'Set to `true` if you know you are transpiling large files.',
    }),
  handler: async () => {},
};
