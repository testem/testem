var fs = require('fs');
var childProcess = require('child_process');
var exec = childProcess.exec;
var async = require('async');
var Bluebird = require('bluebird');
var log = require('npmlog');

var fsStatAsync = Bluebird.promisify(fs.stat);

var envWithLocalPath = require('./env-with-local-path');

var isWin = /^win/.test(process.platform);

var fileExists = function(path, callback) {
  return fsStatAsync(path).then(function(stats) {
    return stats.isFile();
  }).catchReturn(false).asCallback(callback);
};
exports.fileExists = fileExists;

var executableExists = function(exe, options, callback) {
  var cmd = isWin ? 'where' : 'which';

  return new Bluebird.Promise(function(resolve, reject) {
    var test = childProcess.spawn(cmd, [exe], options);
    test.on('error', function(error) {
      log.error('Error spawning "' + cmd + exe + '"', error);
    });
    test.on('close', function(exitCode) {
      if (exitCode === 0) {
        return resolve(true);
      }

      if (exitCode === 1) {
        return resolve(false);
      }

      return reject(exitCode);
    });
  }).asCallback(callback);
};

exports.executableExists = executableExists;

// Async function that tells whether the executable specified for said browser exists on the system
var browserExeExists = findableBy(fileExists);
exports.browserExeExists = browserExeExists;

// Async function that tells whether an executable is findable by the `where` command on Windows
var findableByWhere = findableBy(where);
exports.findableByWhere = findableByWhere;

// Async function that tells whether an executable is findable by the `which` command on Unix
var findableByWhich = findableBy(which);
exports.findableByWhich = findableByWhich;

function findableBy(func) {
  return function(cb) {
    var self = this;
    if (self.exe instanceof Array) {
      async.filter(self.exe, func, function(exes) {
        cb(exes.length > 0);
      });
    } else {
      func(self.exe, cb);
    }
  };
}

exports.where = where;
function where(exe, cb) {
  exec('where ' + exe, { env: envWithLocalPath() }, function(err, exePath) {
    cb(!!exePath);
  });
}

exports.which = which;
function which(exe, cb) {
  exec('which ' + exe, { env: envWithLocalPath() }, function(err, exePath) {
    cb(!!exePath);
  });
}
