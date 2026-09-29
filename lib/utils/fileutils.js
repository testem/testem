

const fs = require('fs');
const execa = require('execa').execa;
const log = require('../log');

const isWin = require('./is-win')();

exports.fileExists = async function fileExists(path) {
  try {
    let stat = await fs.promises.stat(path);
    return stat.isFile();
  } catch {
    return false;
  }
};

exports.executableExists = async function executableExists(exe, options) {
  let cmd = isWin ? 'where' : 'which';
  let result = await execa(cmd, [exe], Object.assign({ reject: false }, options));

  if (result.exitCode === 0) {
    return true;
  } else if (!result.exitCode) {
    log.error('Error spawning "' + cmd + ' ' + exe + '"', result);
  }
  return false;
};
