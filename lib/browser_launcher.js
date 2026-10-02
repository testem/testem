/*

browser_launcher.js
===================

This file more or less figures out how to launch any browser on any platform.

*/


var fileutils = require('./utils/fileutils');
var envWithLocalPath = require('./utils/env-with-local-path');

var executableExists = function(exe, config) {
  return fileutils.executableExists(exe, { env: envWithLocalPath(config) });
};
var fileExists = fileutils.fileExists;

// Returns the available browsers on the current machine.
async function getAvailableBrowsers(config, browsers, cb) {
  browsers.forEach(function(b) {
    b.protocol = 'browser';
  });

  let available;
  try {
    let installed = await Promise.all(browsers.map(browser => isInstalled(browser, config)));

    available = [];
    for (let i = 0; i < browsers.length; i++) {
      if (installed[i]) {
        browsers[i].exe = installed[i];
        available.push(browsers[i]);
      }
    }
  } catch (err) {
    if (cb) {
      cb(err);
    }
    throw err;
  }

  if (cb) {
    cb(null, available);
  }

  return available;
}

async function isInstalled(browser, config) {
  let result = await checkBrowser(browser, 'possiblePath', fileExists);
  if (result) {
    return result;
  }

  return checkBrowser(browser, 'possibleExe', function(exe) {
    return executableExists(exe, config);
  });
}

async function checkBrowser(browser, property, method) {
  let candidates = browser[property];
  if (!candidates) {
    return false;
  }

  if (Array.isArray(candidates)) {
    let found = await Promise.all(candidates.map(candidate => method(candidate)));
    let index = found.findIndex(Boolean);

    return index === -1 ? false : candidates[index];
  }

  return (await method(candidates)) ? candidates : false;
}

exports.getAvailableBrowsers = getAvailableBrowsers;
