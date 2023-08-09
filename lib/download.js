import {
  existsSync as fsExistsSync,
} from 'fs';
import { resolve as pathResolve } from 'path';
import {
  downloadBdcFiles,
  resolveTilde,
} from './utils.js';

// HACK to import state => fips json
// https://www.stefanjudis.com/snippets/how-to-import-json-files-in-es-modules-node-js/
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const STATE_CODES_TO_FIPS = require('../data/state-codes-to-fips.json');
const TECH_LABELS_TO_CODES = require('../data/tech-labels-to-codes.json');
const FILING_TYPE_CODE_TO_DESCRIPTION = require('../data/filing-type-code-to-description.json');

function parseEntityFilter(entityFilter) {
  const [entityType, entityIdsConcat] = entityFilter.split(':');
  let targetEntityIds;

  if (entityType === 'states') {
    if (entityIdsConcat) {
      const stateCodes = entityIdsConcat.split(',');
      targetEntityIds = stateCodes.map((stateCode) => {
        return STATE_CODES_TO_FIPS[stateCode];
      });
    }
  } else if (entityType === 'providers') {
    if (!entityIdsConcat) {
      throw new Error(`Must provide at least one provider ID`);
    }

    // TODO handle providers
    targetEntityIds = entityIdsConcat.split(',');
  } else {
    throw new Error(`Unhandled entity type "${entityType}"`);
  }

  return { entityType, targetEntityIds };
}

function parseFilingFilter(filingFilter) {
  const [filingType, targetTechCodesOrLabelsConcat] = filingFilter.split(':');

  if (!targetTechCodesOrLabelsConcat) {
    return { filingType };
  }
  
  const targetTechCodesOrLabels = targetTechCodesOrLabelsConcat.split(',');
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

  return { filingType, targetTechCodes };
}

async function fetchFilingProcessId(targetFilingDateStr) {
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

  if (!targetFilingDateStr) {
    // sort filings by date
    const filingsSortedByDate = [...filingsWithDates].sort((a, b) => {
      return a.date - b.date;
    });

    // take the last one (most recent)
    const latestFiling = filingsSortedByDate[filingsSortedByDate.length - 1];

    filingProcessId = latestFiling.process_uuid;
  } else {
    // TODO try to match the date to a filing
    // parse date
    const targetFilingDate = Date.parse(targetFilingDateStr);

    const matchingFilings = filingsWithDates.filter((filing) => {
      return filing.date == targetFilingDate;
    });

    if (matchingFilings.length === 0) {
      throw new Error(`No filings matched date "${targetFilingDateStr}"`);
    }

    // haven't seen this, but being defensive here
    if (matchingFilings.length > 1) {
      throw new Error(`Multiple filings for date "${targetFilingDateStr}"`);
    }
    
    filingProcessId = matchingFilings[0].process_uuid;
  }

  return filingProcessId;
}

async function download(options) {
  // unpack args (commander.js rolls up options into single object)
  const {
    entityFilter,
    filingFilter,
    saveDir: saveDirPathRelative,
    invocationOptions,
  } = options;

  // unpack options
  const {
    filingDate,
  } = invocationOptions || {};

  // resolve out dir path in case it's relative
  const saveDirPath = pathResolve(resolveTilde(saveDirPathRelative));

  // VALIDATE that out dir exists
  if (!fsExistsSync(saveDirPath)) {
    console.error(`ERROR: Save directory \`${saveDirPath}\` does not exist`);
    // TODO make the dir if it doesn't exist?
    process.exit(1);
  }

  /*****************************************************************************
   * FILTER THE BIG DOWNLOAD LIST
   ****************************************************************************/

  // get filing process id
  let filingProcessId;

  try {
    // if filing date is null, defaults to latest
    filingProcessId = await fetchFilingProcessId(filingDate);
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

  // parse filters
  const { entityType, targetEntityIds } = parseEntityFilter(entityFilter);
  const { filingType, targetTechCodes } = parseFilingFilter(filingFilter);

  // get target filing type
  const targetDataCategory = (
    entityType === 'states' ? 'Nationwide' : 'Provider'
  );
  const targetDataType = FILING_TYPE_CODE_TO_DESCRIPTION[filingType];

  // filter downloads
  const matchingDownloads = downloads.filter((download) => {
    const dataCategoryMatches = (download.data_category === targetDataCategory);
    const dataTypeMatches = (download.data_type === targetDataType);
    const targetEntityIdsIsUnsetOrMatches = (
      !targetEntityIds ||
      targetEntityIds.includes(download.state_fips)
    );
    const targetTechCodesIsUnsetOrMatches = (
      !targetTechCodes ||
      targetTechCodes.includes(download.technology_code)
    );

    return (
      dataCategoryMatches &&
      dataTypeMatches &&
      targetEntityIdsIsUnsetOrMatches &&
      targetTechCodesIsUnsetOrMatches
    );
  });

  // VALIDATE at least one download
  if (matchingDownloads.length < 1) {
    console.error(`No matching downloads found. Please check your filters and try again.`);
    process.exit(1);
  }

  console.info(`Going to download ${matchingDownloads.length} files`);
  console.info(`Save directory: ${saveDirPath}`);

  // TODO recover old downloads
  // if (!isDirEmpty(saveDirPath)) {
  //   console.info(
  //     'INFO: Found existing files in the save directory. ' +
  //     'Will try to resume download...'
  //   );

  //   // TODO diff the file names to determine the outstanding downloadlist

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

  await downloadBdcFiles(saveDirPath, urlsAndFileNames);
} 

// DEBUG
// download({
//   entityFilter: 'states:il',
//   filingFilter: 'fixed',
//   saveDir: '~/Downloads/bdckit-test',
//   invocationOptions: {},
// });

// time trial - il
// 1: 44s
// 2: 33s
// 3: 30s ???

// time trial - ca
// 1: 1m37
// 2: 1m22
// 3: 1m12
// 6: 1m12

// time trial - ri,de,wy,nv - impopulous states
// 1: 25-28s
// 2: 15s
// 3: 14s
// 5: 13s
// 6: 14s
// 12: 13

// time trial - ri,wi,mi mobile
// 1: 28s
// 3: 17s


// all states fixed at 3/time: 
export default download;
