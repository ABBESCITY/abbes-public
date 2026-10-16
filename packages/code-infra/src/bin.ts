#!/usr/bin/env node
import yargs, { CommandModule } from 'yargs';
import { hideBin } from 'yargs/helpers';

import buildCommand from './commands/build';
import publishCommand from './commands/publish';

yargs(hideBin(process.argv))
  .scriptName('code-infra')
  .usage('$0 <command> [options]')
  .command([buildCommand, publishCommand])
  .demandCommand(1, 'You need to specify a command.')
  .recommendCommands()
  .strict()
  .help()
  .alias('help', 'h')
  .version()
  .alias('version', 'v')
  .parse();
