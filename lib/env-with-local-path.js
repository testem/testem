'use strict';

var _ = require('lodash');
var path = require('path');
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

var modulesPath = path.join(process.cwd(), 'node_modules', '.bin');

module.exports = function envWithLocalPath() {
  var env = _.clone(process.env);
  env[PATH] = [modulesPath, env[PATH]].join(process.platform === 'win32' ? ';' : ':');

  return env;
};
