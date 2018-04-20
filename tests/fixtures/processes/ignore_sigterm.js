'use strict';

process.stdin.resume();

process.on('SIGTERM', function() {
  // Ignore
  console.log('SIGTERM ignored');
});
