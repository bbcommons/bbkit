/**
 * given some list of urls and a target dir, download them
 */
import fs from 'fs';
import stream from 'stream';
import async from 'async';

// adapted from https://stackoverflow.com/a/51302466/676001
async function downloadFile(targetDirPath, url, fileName) {
  // TODO better progress reporting
  console.log('Downloading', url);

  // go get the file
  const res = await fetch(url);

  // check for non-success status
  const { status } = res;
  if (status !== 200) {
    throw new Error(`Fetch failed with status ${status}`);
  }

  // TODO default behavior is to overwrite the file; don't do this?
  // TODO should probably use `path` here
  const targetFilePath = `${targetDirPath}/${fileName}.zip`
  const targetWriteStream = fs.createWriteStream(targetFilePath);

  // any error inside this try should trigger deletion of the (incomplete/
  // invalid) target file
  try {
    // convert web stream to native readable stream
    const { body } = res;
    const sourceReadable = stream.Readable.fromWeb(body);

    // TODO this is an example of an error that results in an empty/stray file
    // throw new Error('mock unhandled error');
    const pipeStream =
      sourceReadable
        .pipe(targetWriteStream)
        // TODO this might not be necessary because of the finished below
        // see https://nodejs.org/api/stream.html#streamfinishedstream-options
        .on('error', (e) => {
          // throw an error to drop down into the catch and delete the file
          throw e;
        });
      ;

    return stream.promises.finished(pipeStream);
  } catch (e) {
    // TODO delete the write stream file

    throw e;
  }
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
