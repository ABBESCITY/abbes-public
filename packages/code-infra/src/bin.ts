#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import buildCommand from './commands/build';

yargs(hideBin(process.argv))
  .scriptName('code-infra')
  .command(buildCommand)
  .demandCommand(1, 'Please provide a command.')
  .strict()
  .help()
  .parse();
