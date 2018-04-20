'use strict';

var fs = require('fs');

var stateFile = process.argv[2];

fs.writeFile(stateFile, process.pid, function(err) {
  if (err) {
    throw err;
  }

  console.log('Ready!');

  process.stdin.resume();
});
