
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const fsStatAsync = promisify(fs.stat);

const isWin = require('./is-win')();
const addToPATH = require('./add-to-PATH');

exports.fileExists = function fileExists(filePath) {
  return fsStatAsync(filePath).then(stat => stat.isFile()).catch(() => false);
};

function pathKey(env) {
  if (!isWin) {
    return 'PATH';
  }
  return Object.keys(env).find(key => key.match(/^PATH$/i)) || addToPATH.PATH;
}

function executableNames(exe) {
  if (!isWin || path.extname(exe)) {
    return [exe];
  }
  const pathext = process.env.PATHEXT || '.EXE;.CMD;.BAT;.COM';
  return [exe].concat(pathext.split(';').filter(Boolean).map(ext => exe + ext));
}

// Search PATH instead of spawning `which`/`where`.
exports.executableExists = function executableExists(exe, options) {
  if (path.isAbsolute(exe)) {
    return exports.fileExists(exe);
  }

  const env = (options && options.env) || process.env;
  const delimiter = isWin ? ';' : ':';
  const dirs = String(env[pathKey(env)] || '').split(delimiter).filter(Boolean);
  const names = executableNames(exe);

  return Promise.all(dirs.map(dir => {
    return Promise.all(names.map(name => exports.fileExists(path.join(dir, name))))
      .then(hits => hits.some(Boolean));
  })).then(hits => hits.some(Boolean));
};
