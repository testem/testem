'use strict';

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

module.exports = function addToPATH(path) {
  var env = _.cloneDeep(process.env);
  env[PATH] = [path, env[PATH]].join(process.platform === 'win32' ? ';' : ':');

  return env;
};

module.exports.PATH = PATH;
