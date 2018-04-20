#!/usr/bin/env node
'use strict';

var execa = require('execa');
var command = 'npm';

var args;
if (process.env.BROWSER_TESTS) {
  args = ['run', 'browser-tests'];
} else {
  args = ['run', 'testem-tests'];
}

console.log('Running: ' + command + ' ' + args.join(' '));

execa(command, args, { stdio: 'inherit' }).then(function(result) {
  process.exit(result.code);
}).catch(function(err) {
  console.error(err);
  process.exit(1);
});
