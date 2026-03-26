

const fs = require('fs');
const execa = require('execa').execa;
const { promisify } = require('util');
const log = require('../log');

const fsStatAsync = promisify(fs.stat);

const isWin = require('./is-win')();

exports.fileExists = function fileExists(path) {
  return fsStatAsync(path).then(stat => stat.isFile()).catchReturn(false);
};

exports.executableExists = function executableExists(exe, options) {
  let cmd = isWin ? 'where' : 'which';
  let test = execa(cmd, [exe], Object.assign({ reject: false }, options));

  return test.then(result => {
    if (result.exitCode === 0) {
      return true;
    } else if (!result.exitCode) {
      log.error('Error spawning "' + cmd + ' ' + exe + '"', result);
    }
    return false;
  });
};
