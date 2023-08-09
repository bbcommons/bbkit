#!/usr/bin/env node

import chalk from 'chalk';
import { Command } from 'commander';
import figlet from 'figlet';
import download from './lib/download.js';

// HACK because importing json is sort of off-label in node 18
// https://stackoverflow.com/a/74504130/676001
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const manifest = require('./package.json');

const program = new Command();

program
  .name('bdc')
  .description(manifest.description)
  .version(manifest.version);

program.addHelpText(
  'beforeAll',
  chalk.magenta(figlet.textSync('bdckit', { font: 'lean' }))
);

program.command('download')
  .description('Download BDC data')
  // TODO document the entity and filing filter syntax better
  .argument(
    'entity_filter',
    'Examples: "states", "states:ca", "providers:134234"',
  )
  .argument(
    'filing_filter',
    'Examples: "fixed", "fixed:wired", "fixed:40,50", "supporting"',
  )
  .argument(
    'save_dir',
    'Path to directory where downloads should go. Use "." for the current directory.'
  )
  .option(
    '-d, --filing-date <date>',
    'A previous filing date, e.g. "2023-06-30"'
  )
  // .option(
  //   '-t, --technologies <list>',
  //   // TODO explain these better
  //   'Comma-separated list of tech codes or labels. Available labels include:\n' +
  //   '- Fixed: "all", "cable", "copper", "fiber", "fixed", "satellite", "terrestrial", "wired", "wireless"\n' +
  //   '- Mobile: "all", "3g", "4g", "5g"',
  //   'all',
  // )
  // .option(
  //   '-T, --filing-type <type>',
  //   'For states: "fixed", "mobile", or "all"' +
  //   'For providers: "fixed", "mobile", "supporting", or "all"',
  //   'all',
  // )
  // TODO add option to pass in dates
  .action(async (
    entityFilter,
    filingFilter,
    saveDir,
    // options get passed in as a single object
    invocationOptions
  ) => {
    const options = {
      entityFilter,
      filingFilter,
      saveDir,
      ...invocationOptions,
    };

    // TODO validate args

    // TODO there are still some kinks with supporting data, so reject it for 
    // now
    if (filingFilter.includes('supporting')) {
      console.error('ERROR: Downloading supporting data is not yet supported.');
      process.exit(1);
    }

    await download(options);
  });

program.parse();
