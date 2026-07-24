#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import cmdBuildHandler from '../command/build';

yargs(hideBin(process.argv))
  .scriptName('code-infra')
  .usage('$0 <command> [args]')
  .command(cmdBuildHandler)
  .demandCommand(1, 'Please specify a command.')
  .strict()
  .help()
  .parseAsync();
