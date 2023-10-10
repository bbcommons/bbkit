#!/usr/bin/env node

import { Command } from 'commander';

const program = new Command();

program
  .name('bdc-availability')
  .command(
    'download',
    'Download BDC data',
    {
      executableFile: './download/index.js',
    },
  );

program.parse();
