/*

browser_launcher.js
===================

This file more or less figures out how to launch any browser on any platform.

*/


var fileutils = require('./utils/fileutils');
var envWithLocalPath = require('./utils/env-with-local-path');
const { filter, asCallback } = require('./utils/promises');

var executableExists = function(exe, config) {
  return fileutils.executableExists(exe, { env: envWithLocalPath(config) });
};
var fileExists = fileutils.fileExists;

// Returns the available browsers on the current machine.
function getAvailableBrowsers(config, browsers, cb) {
  browsers.forEach(function(b) {
    b.protocol = 'browser';
  });

  return filter(browsers, function(browser) {
    return isInstalled(browser, config).then(function(result) {
      if (!result) {
        return false;
      }

      browser.exe = result;
      return true;
    });
  }).then(...asCallback(cb));
}

function isInstalled(browser, config) {
  return checkBrowser(browser, 'possiblePath', fileExists).then(function(result) {
    if (result) {
      return result;
    }

    return checkBrowser(browser, 'possibleExe', function(exe) {
      return executableExists(exe, config);
    });
  });
}

function checkBrowser(browser, property, method) {
  if (!browser[property]) {
    return Promise.resolve(false);
  }

  if (Array.isArray(browser[property])) {
    return filter(browser[property], method).then(function(result) {
      if (result.length === 0) {
        return false;
      }

      return result[0];
    });
  }

  return method(browser[property]).then(function(result) {
    if (!result) {
      return false;
    }

    return browser[property];
  });
}

exports.getAvailableBrowsers = getAvailableBrowsers;
