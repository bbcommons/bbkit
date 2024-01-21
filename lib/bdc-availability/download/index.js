#!/usr/bin/env node

/**
 * this is where the `download` cli command is defined. it processes args and 
 * then calls the `download` function from `download.js`.
 */

import {
  Command,
} from 'commander';
import download from './download.js';
import normalizeCliArgs from './args.js';


/**
 * SET UP
 */

const program = new Command()
  .argument(
    '<entity-type>',
    'Only `states` is supported currently',
  )
  .argument(
    '<entity-ids>',
    '`all`, or a comma-separated list of entity IDs, e.g. `ca,nv,az`',
  )
  .argument(
    '<filing-type>',
    '`fixed` or `mobile`',
  )
  .argument(
    '<output-dir>',
    'Path to the directory to save downloads to',
  )
  .option(
    '-t, --tech <tech>',
    'Technology names or codes to filter by, e.g. `fiber`, `3g`, `wired`, or `10,40,50`'
  )
  .option(
    '-f, --format <format>',
    'File format (for mobile only; `gpkg` or `shp`)',
  )
  .option(
    '-d, --filing-date <filing-date>',
  )
;

program.parse();


/**
 * NORMALIZE ARGS
 * this validates the cli args and merges them into a single options object as
 * expected by the download function
 */

const fnOptions = normalizeCliArgs(program.args, program.opts());


/**
 * MAIN
 */

download(fnOptions);
