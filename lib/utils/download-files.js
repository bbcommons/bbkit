/**
 * given some list of urls and a target dir, download them
 */
import { createWriteStream as fsCreateWriteStream } from 'fs';
import { Readable as StreamReadable } from 'stream';
import { finished as streamFinished } from 'stream/promises';
import { mapLimit as asyncMapLimit } from 'async';

async function downloadFile(saveDirPath, url, fileName) {
  // TODO better progress reporting
  console.log('Downloading', url);

  // note: default behavior is to overwrite the file
  const outPath = `${saveDirPath}/${fileName}.zip`
  const writeStream = fsCreateWriteStream(outPath);  
  
  const { body } = await fetch(url);

  // convert web stream to readable stream
  const readable = StreamReadable.fromWeb(body);

  return streamFinished(readable.pipe(writeStream));

  // TODO don't do this if they pass in the future "don't unzip" flag
  // await unzipFile(outPath, saveDirPath);
}

async function downloadFiles(
  saveDirPath,
  urlsAndFilesNames,
  numConcurrentRequests = 3,
) {
  return asyncMapLimit(
    urlsAndFilesNames,
    numConcurrentRequests,
    async (urlAndFileName) => {
      const { url, fileName } = urlAndFileName;
      return downloadFile(saveDirPath, url, fileName);
    },
  );
}

export default downloadFiles;
