#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import cmdBuildHandler from '../commands/build';
import cmdBuildManyHandler from '../commands/buildMany';

yargs(hideBin(process.argv))
  .scriptName('code-infra')
  .usage('$0 <command> [args]')
  .command(cmdBuildHandler)
  .command(cmdBuildManyHandler)
  .demandCommand(1, 'Please specify a command.')
  .strict()
  .help()
  .parseAsync();
