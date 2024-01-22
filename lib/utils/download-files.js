/**
 * given some list of urls and a target dir, download them
 */
import fs from 'fs';
import stream, { finished } from 'stream';
import async from 'async';

// adapted from https://stackoverflow.com/a/51302466/676001
async function downloadFile(targetDirPath, url, fileName) {
  // TODO better progress reporting
  console.log('Downloading', url);

  // TODO default behavior is to overwrite the file; don't do this?
  // TODO should probably use `path` here
  const targetFilePath = `${targetDirPath}/${fileName}.zip`
  const targetWriteStream = fs.createWriteStream(targetFilePath);

  // go get the file
  const res = await fetch(url);

  // convert web stream to native readable stream
  const sourceReadable = stream.Readable.fromWeb(res.body)

  // pipe and return promise for when finished
  return stream.promises.finished(
    sourceReadable.pipe(targetWriteStream)
  );
}

async function downloadFiles(
  saveDirPath,
  urlsAndFilesNames,
  numConcurrentRequests = 3,
) {
  return async.mapLimit(
    urlsAndFilesNames,
    numConcurrentRequests,
    async (urlAndFileName) => {
      const { url, fileName } = urlAndFileName;
      return downloadFile(saveDirPath, url, fileName);
    },
  );
}

export default downloadFiles;
