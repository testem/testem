#!/usr/bin/env node

var saucie = require('saucie');
var pidFile = 'sc_client.pid';

var opts = {
  username: process.env.SAUCE_USERNAME,
  accessKey: process.env.SAUCE_ACCESS_KEY,
  logger: console.log,
  pidfile: pidFile,
  detached: true,
  waitForApiReady: true,
  // Keep this in sync with saucie's default tunnel name in lib/config.js.
  tunnelIdentifier: process.env.GITHUB_RUN_ID || 'saucie',
  build: process.env.GITHUB_RUN_NUMBER || 1,
};

saucie.connect(opts).then(function() {
  process.exit(0);
}).catch(function(err) {
  console.error(err);
  process.exit(1);
});
