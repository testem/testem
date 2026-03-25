#!/usr/bin/env node

var saucie = require('saucie');
var pidFile = 'sc_client.pid';

var opts = {
  username: process.env.SAUCE_USERNAME,
  accessKey: process.env.SAUCE_ACCESS_KEY,
  verbose: true,
  logger: console.log,
  pidfile: pidFile,
  // Keep this in sync with saucie's default tunnel name in lib/config.js.
  tunnelIdentifier: process.env.TRAVIS_JOB_NUMBER || 'saucie'
};

saucie.connect(opts).then(function () {
  process.exit();
});
