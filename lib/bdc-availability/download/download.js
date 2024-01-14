import {
  existsSync as fsExistsSync,
  mkdirSync as fsMkdirSync,
} from 'fs';
import { resolve as pathResolve } from 'path';
import {
  downloadBdcFiles,
  resolveTilde,
  warn,
} from '../../utils.js';

// HACK to import state => fips json
// https://www.stefanjudis.com/snippets/how-to-import-json-files-in-es-modules-node-js/
import { createRequire } from 'module';
import { match } from 'assert';
const require = createRequire(import.meta.url);
const STATE_CODES_TO_FIPS = require('../../../data/state-codes-to-fips.json');
const TECH_LABELS_TO_CODES = require('../../../data/tech-labels-to-codes.json');
const FILING_TYPE_CODE_TO_DESCRIPTION = require('../../../data/filing-type-code-to-description.json');

function parseEntityIdString(entityType, entityIdString) {
  let entityIds;

  if (entityType === 'states') {
    if (entityIdString && entityIdString !== 'all') {
      const stateCodes = entityIdString.split(',');
      // TODO what if an unknown state code is passed in?



      entityIds = stateCodes.map((stateCode) => {
        return STATE_CODES_TO_FIPS[stateCode];
      });
    }
  }

  return entityIds;
}

function parseTechString(techString) {
  const targetTechCodesOrLabels = techString.split(',');
  const targetTechCodesWithDupes = [];

  // get unique tech codes and label for reference
  const techCodesWithDupes = [].concat(...Object.values(TECH_LABELS_TO_CODES));
  const techCodes = [...new Set(techCodesWithDupes)];
  const techLabels = Object.keys(TECH_LABELS_TO_CODES);

  for (let targetTechCodeOrLabel of targetTechCodesOrLabels) {
    // if it's a label
    if (techLabels.includes(targetTechCodeOrLabel)) {
      targetTechCodesWithDupes.push(
        ...TECH_LABELS_TO_CODES[targetTechCodeOrLabel]
      );
    // if it's a code
    } else if (techCodes.includes(targetTechCodeOrLabel)) {
      targetTechCodesWithDupes.push(targetTechCodeOrLabel);
    } else {
      // TODO validate this on command invoke?
      throw new Error(`Not a known tech code: "${targetTechCodeOrLabel}"`);
    }
  }

  // dedupe (sort of an edge case that there would be dupes, e.g. wired,fiber)
  const targetTechCodes = [...new Set(targetTechCodesWithDupes)];

  return targetTechCodes;
}

async function fetchFilingProcessId(targetFilingDateString) {
  // get the filing "process id" for the specified date
  const filingsRes = await fetch('https://broadbandmap.fcc.gov/nbm/map/api/published/filing');
  const filingsJson = await filingsRes.json();
  const filings = filingsJson.data;

  // parse filing dates
  const filingsWithDates = filings.map((filing) => ({
    ...filing,
    // HACK the filing dates aren't iso, so javascript parses them as local
    // time. append utc.
    // https://stackoverflow.com/a/32252922/676001
    date: Date.parse(filing.filing_subtype + ' 00:00:00 UTC'),
  }));

  let filingProcessId;

  // if we don't have a target filing date, use the latest
  if (!targetFilingDateString) {
    const filingsSortedByDate = [...filingsWithDates].sort((a, b) => {
      return a.date - b.date;
    });

    const latestFiling = filingsSortedByDate[filingsSortedByDate.length - 1];
    filingProcessId = latestFiling.process_uuid;
  } else {
    // TODO try to match the date to a filing
    // parse date
    const targetFilingDate = Date.parse(targetFilingDateString);

    const matchingFilings = filingsWithDates.filter((filing) => {
      return filing.date == targetFilingDate;
    });

    if (matchingFilings.length === 0) {
      throw new Error(`No filings matched date "${targetFilingDateString}"`);
    }

    // haven't seen this, but being defensive here
    if (matchingFilings.length > 1) {
      throw new Error(`Multiple filings for date "${targetFilingDateString}"`);
    }
    
    filingProcessId = matchingFilings[0].process_uuid;
  }

  return filingProcessId;
}

async function download(options) {
  /**
   * SET UP
   */

  const {
    entityType,
    entityIds: entityIdString,
    filingType,
    outputDir: outDirPathRelative,
    filingDate: filingDateString,
    format,
    tech: techString,
  } = options;
  
  // resolve out dir path in case it's relative
  const outDirPath = pathResolve(resolveTilde(outDirPathRelative));

  // VALIDATE that out dir exists
  if (!fsExistsSync(outDirPath)) {
    // error(`Output directory \`${outDirPath}\` does not exist.`);
    
    warn(`Output directory doesn't exist. Creating...`);
    
    fsMkdirSync(outDirPath);
  }


  /**
   * FETCH DOWNLOADS LIST
   */

  // get filing process id
  let filingProcessId;

  try {
    // if filing date is null, defaults to latest
    filingProcessId = await fetchFilingProcessId(filingDateString);
  } catch (e) {
    // TODO better error handling
    console.error(`Error fetching filing process ID: ${e}`);
    process.exit(1);
  }

  // get big download list (every possible download for the filing period)
  const downloadsRes = await fetch(
    `https://broadbandmap.fcc.gov/nbm/map/api/national_map_process/nbm_get_data_download/${filingProcessId}`
  );
  const downloadsJson = await downloadsRes.json();
  const downloads = downloadsJson.data;


  /**
   * FILTER DOWNLOADS LIST
   */

  const entityIds = parseEntityIdString(entityType, entityIdString);

  // parse/normalize tech filter
  let targetTechCodes;

  if (techString) {
    targetTechCodes = parseTechString(techString);
  }

  // get target data "category" and "type" (this is bdc terminology; the type
  // is sort of like a subcategory). category is hard-coded for now until
  // if/when we want to support provider downloads.
  const targetDataCategory = 'Nationwide';
  // this maps "fixed" => "Fixed Availability", etc.
  const targetDataType = FILING_TYPE_CODE_TO_DESCRIPTION[filingType];

  // filter downloads
  const matchingDownloads = downloads.filter((download) => {
    const dataCategoryMatches = (download.data_category === targetDataCategory);
    const dataTypeMatches = (download.data_type === targetDataType);
    const entityIdsIsUnsetOrMatches = (
      !entityIds ||
      entityIds.includes(download.state_fips)
    );
    const targetTechCodesIsUnsetOrMatches = (
      !targetTechCodes ||
      targetTechCodes.includes(download.technology_code)
    );

    return (
      dataCategoryMatches &&
      dataTypeMatches &&
      entityIdsIsUnsetOrMatches &&
      targetTechCodesIsUnsetOrMatches
    );
  });

  // RULE must have at least one download
  if (matchingDownloads.length < 1) {
    console.error(`No matching downloads found. Please check your filters and try again.`);
    process.exit(1);
  }

  console.info(`Going to download ${matchingDownloads.length} file${matchingDownloads.length > 1 ? 's' : ''}`);
  console.info(`Save directory: ${outDirPath}`);

  // TODO check for existing downloads / prior run
  // if (!isDirEmpty(outDirPath)) {
  //   console.info(
  //     'INFO: Found existing files in the save directory. ' +
  //     'Will try to resume download...'
  //   );
  // }

  const urlsAndFileNames = matchingDownloads.map((matchingDownload) => {
    const {
      file_name: fileName,
      id,
    } = matchingDownload;

    const url = `https://broadbandmap.fcc.gov/nbm/map/api/getNBMDataDownloadFile/${id}/1`;

    return {
      fileName,
      url,
    };
  });

  await downloadBdcFiles(outDirPath, urlsAndFileNames);
} 

// DEBUG
// download({
//   entityType: 'states',
//   entityIds: 'ri',
//   filingType: 'fixed',
//   outDir: '~/Downloads/bbkit-test',
//   // tech: 'fiber',
//   // format: 'shp',
//   // filingDate: '',
// });

export default download;
