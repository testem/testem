#!/usr/bin/env node
'use strict';

const execa = require('execa');
const command = 'npm';

let args;
if (process.env.BROWSER_TESTS) {
  args = ['run', 'browser-tests'];
} else {
  args = ['run', 'testem-tests'];
}

console.log('Running: ' + command + ' ' + args.join(' '));

execa(command, args, { stdio: 'inherit' }).then(result => {
  process.exit(result.code);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
