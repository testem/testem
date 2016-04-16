var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec;
var async = require('async');
var fileExists = fs.exists || path.exists;
var _ = require('lodash');

var PATH = 'PATH';

// windows calls it's path 'Path' usually, but this is not guaranteed.
if (process.platform === 'win32') {
  PATH = 'Path';
  Object.keys(process.env).forEach(function(e) {
    if (e.match(/^PATH$/i)) {
      PATH = e;
    }
  });
}

exports.fileExists = fileExists;

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

var modulesPath = path.join(process.cwd(), 'node_modules', '.bin');

function envWithLocalPath() {
  var env = _.clone(process.env);
  env[PATH] = [modulesPath, env[PATH]].join(process.platform === 'win32' ? ';' : ':');

  return env;
}
