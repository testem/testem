'use strict';

var fs = require('fs');
var execa = require('execa');
var Bluebird = require('bluebird');
var log = require('npmlog');

var fsStatAsync = Bluebird.promisify(fs.stat);

var isWin = require('./utils/is-win')();

exports.fileExists = function fileExists(path) {
  return fsStatAsync(path).then(function(stats) {
    return stats.isFile();
  }).catchReturn(false);
};

exports.executableExists = function executableExists(exe, options) {
  var cmd = isWin ? 'where' : 'which';
  var test = execa(cmd, [exe], options);

  test.on('error', function(error) {
    log.error('Error spawning "' + cmd + exe + '"', error);
  });

  return test.then(function(result) {
    return result.code === 0;
  }, function() {
    return false;
  });
};
