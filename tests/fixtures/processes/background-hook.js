'use strict';

var fs = require('fs');

var stateFile = process.argv[2];

fs.writeFile(stateFile, process.pid.toString(), function(err) {
  if (err) {
    throw err;
  }

  console.log('Ready!');

  process.stdin.resume();
});
