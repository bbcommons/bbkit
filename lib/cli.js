#!/usr/bin/env node

import chalk from 'chalk';
import { Command } from 'commander';
import figlet from 'figlet';

// HACK because importing json is not totally supported in node 18
// https://stackoverflow.com/a/74504130/676001
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const manifest = require('../package.json');

const program = new Command();

program
  .name('bb')
  .version(manifest.version)
  .description(manifest.description)
  .command(
    'bdc-availability',
    'FCC fixed and mobile availability data',
    {
      executableFile: './bdc-availability/index.js',
    },
  );

program.addHelpText(
  'beforeAll',
  chalk.magenta(figlet.textSync('bbkit', { font: 'lean' }))
);

program.parse();
