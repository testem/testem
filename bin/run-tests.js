#!/usr/bin/env node
var spawn = require('child_process').spawn;

function run(command, args, cb) {

  console.log('Running: ' + command + ' ' + args.join(' '));

  var child = spawn(command, args, { stdio: 'inherit' });

  child.on('error', function(err) {
    cb(err);
  });

  child.on('exit', function(code) {
    if (code === 0) {
      return cb();
    }

    cb(code);
  });
}

var testArgs;
if (process.env.BROWSER_TESTS) {
  testArgs = ['run', 'browser-tests'];
} else {
  testArgs = ['run', 'testem-tests'];
}

run('npm', testArgs, function(err) {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  process.exit(0);
});
