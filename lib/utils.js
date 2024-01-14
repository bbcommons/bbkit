import { readdirSync as fsReaddirSync } from 'fs';
import { mkdir as fsPromisesMkDir } from 'fs/promises';
import { homedir as osHomedir } from 'os';
import {  pipeline } from 'stream/promises';
import chalk from 'chalk';
import yauzl from 'yauzl-promise';

function warn(msg) {
  console.log(chalk.yellow('WARNING: ') + msg);
}

function error(msg) {
  console.log(chalk.red('ERROR: ') + msg);
  process.exit(1);
}

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

// helper to check if a directory is empty
// https://stackoverflow.com/a/60676464/676001
function isDirEmpty(dirPath) {
  return fsReaddirSync(dirPath).length === 0;
}

// from https://stackoverflow.com/a/57243075/676001
function resolveTilde (filePath) {
  if (!filePath || typeof(filePath) !== 'string') {
    return '';
  }

  if (filePath.startsWith('~/') || filePath === '~') {
    return filePath.replace('~', osHomedir());
  }

  return filePath;
}

export {
  error,
  isDirEmpty,
  resolveTilde,
  warn,
};
