export default {
  command: 'publish',
  describe: '',
  builder: (yargs: any) =>
    yargs.option('hasLargeFiles', {
      type: 'boolean',
      default: false,
      describe: 'Set to `true` if you know you are transpiling large files.',
    }),
  handler: async () => {},
};
