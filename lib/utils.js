import {
  readdirSync as fsReaddirSync,
  createWriteStream as fsCreateWriteStream,
} from 'fs';
import { mkdir as fsPromisesMkDir } from 'fs/promises';
import { homedir as osHomedir } from 'os';
import { Readable as StreamReadable } from 'stream';
import {
  finished as streamFinished,
  pipeline,
} from 'stream/promises';
import { mapLimit as asyncMapLimit } from 'async';
import yauzl from 'yauzl-promise';

// adapted from
// https://github.com/overlookmotel/yauzl-promise#simple-usage
async function unzipFile(zipFilePath, outDir) {
  const zip = await yauzl.open(zipFilePath);

  try {
    for await (const entry of zip) {
      if (entry.filename.endsWith('/')) {
        // TODO use path join to concatenate these more safely?
        await fsPromisesMkDir(`${outDir}/${entry.filename}`);
      } else {
        const readStream = await entry.openReadStream();
        const writeStream = fsCreateWriteStream(
          `${outDir}/${entry.filename}`
        );
        await pipeline(readStream, writeStream);
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    await zip.close();
  }
}

async function downloadBdcFile(saveDirPath, url, fileName) {
  console.log('download bdc file', url, saveDirPath);

  // for testing: fiber in the mariana islands is a very small download... :(
  // https://broadbandmap.fcc.gov/nbm/map/api/getNBMDataDownloadFile/189609/1

  // note: default behavior is to overwrite the file
  const outPath = `${saveDirPath}/${fileName}.zip`
  const writeStream = fsCreateWriteStream(outPath);
  // const writeStream = fsCreateWriteStream(`${saveDirPath}/${fileName}.csv`);
  
  const { body } = await fetch(url);

  // convert web stream to readable stream
  const readable = StreamReadable.fromWeb(body);

  return streamFinished(readable.pipe(writeStream));

  // TODO don't do this if they pass in the future "don't unzip" flag
  // await unzipFile(outPath, saveDirPath);
}

// download files in parallel
async function downloadBdcFiles(
  saveDirPath,
  urlsAndFilesNames,
  numConcurrentRequests = 3,
) {
  // const promises = urlsAndFilesNames.map((urlAndFileName) => {
  //   const { url, fileName } = urlAndFileName;
  //   return downloadBdcFile(saveDirPath, url, fileName);
  // });

  // for (let i = 0; i < urlsAndFilesNames.length; i += numConcurrentRequests)

  return asyncMapLimit(
    urlsAndFilesNames,
    numConcurrentRequests,
    async (urlAndFileName) => {
      const { url, fileName } = urlAndFileName;
      return downloadBdcFile(saveDirPath, url, fileName);
    },
  );
}

// helper to check if a directory is empty
// https://stackoverflow.com/a/60676464/676001
function isDirEmpty(dirPath) {
  return fsReaddirSync(dirPath).length === 0;
}

// https://stackoverflow.com/a/57243075/676001
/**
 * Resolves paths that start with a tilde to the user's home directory.
 *
 * @param  {string} filePath '~/GitHub/Repo/file.png'
 * @return {string}          '/home/bob/GitHub/Repo/file.png'
 */
function resolveTilde (filePath) {
  if (!filePath || typeof(filePath) !== 'string') {
    return '';
  }

  // '~/folder/path' or '~' not '~alias/folder/path'
  if (filePath.startsWith('~/') || filePath === '~') {
    return filePath.replace('~', osHomedir());
  }

  return filePath;
}

export {   
  downloadBdcFile,
  downloadBdcFiles,
  isDirEmpty,
  resolveTilde,
};
