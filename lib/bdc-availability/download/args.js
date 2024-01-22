import { error, warn } from '../../utils/index.js';

// HACK to import state => fips json
// https://www.stefanjudis.com/snippets/how-to-import-json-files-in-es-modules-node-js/
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const STATE_CODES_TO_FIPS = require('../../../data/state-codes-to-fips.json');

/**
 * this is where the business logic lives for making sure we have the right
 * options for what the user wants to do. also merges them into a single
 * object as expected by the download fn.
 */

function normalizeCliArgs(args, opts) {
  const [ entityType, entityIds, filingType, outputDir ] = args;
  const { filingDate, format, tech } = opts;
  
  // RULE: entity type must be `states` (for now)
  if (entityType !== 'states') {
    error(`Entity type must be \`states\``);
  }

  // RULE: entity ids must be `all` or a comma-delimited list of state abbrs
  // ASSUMPTION: entity type is states
  const STATE_CODES = Object.keys(STATE_CODES_TO_FIPS);

  if (entityIds !== 'all') {
    let targetStateCodes;
    // try to split
    try {
      targetStateCodes = entityIds.split(',');

      for (let targetStateCode of targetStateCodes) {
        if (!STATE_CODES.includes(targetStateCode)) {
          error(`Unknown state \`${targetStateCode}\``);
        }
      }
    } catch (e) {
      error(
        `Invalid entity IDs \`${entityIds}\`. See \`bb bdc-availability download --help\` for examples.`
      );
    }
  }
        
  // RULE: filing type must be fixed or mobile
  if (!['fixed', 'mobile'].includes(filingType)) {
    error(`Filing type must be \`fixed\` or \`mobile\``);
  }

  // FIXED
  if (filingType === 'fixed') {
    // RULE: format must be csv, or omitted
    if (format) {
      if (format.toLowerCase() === 'csv') {
        warn(`Fixed availability is only available as CSV; format option is not needed.`);
      } else {
        error(
          `Invalid format \`${format}\`. Fixed availability data is only availble as CSV.\n💡 Tip: This command fetches CSV by default, so the format option is not needed.`
        );
      }
    }
  }

  // MOBILE
  else {
    if (!format) {
      // RULE must provide format
      error(`Must provide format. See \`bb bdc-availability download --help\` for examples.`);
    }
    else if (!['gpkg', 'shp'].includes(format)) {
      // RULE format must be shp or gpkg
      error(`Invalid format \`${format}. Must be \`shp\` or \`gpkg\`.`);
    }
  }

  return {
    entityType,
    entityIds,
    filingType,
    outputDir,
    filingDate,
    format,
    tech,
  };
}

export default normalizeCliArgs;
