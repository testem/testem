'use strict';

var path = require('path');
var fs = require('fs');
var addToPATH = require('./add-to-PATH');

module.exports = function envWithLocalPath(config) {
  var configPath = path.join(config.cwd(), 'node_modules', '.bin');
  var modulesPath;

  if (fs.existsSync(configPath)) {
    modulesPath = configPath;
  } else {
    modulesPath = path.join(process.cwd(), 'node_modules', '.bin');
  }
  return addToPATH(modulesPath);
};

module.exports.PATH = addToPATH.PATH;
