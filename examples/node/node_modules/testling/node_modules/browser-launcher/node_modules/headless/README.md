node-headless
=========

node-headless makes it easy to start and use Xvfb in node.
headless is inspired by xvfb-run - it searches for a free X display number and starts Xvfb on that.

API
=======

````javascript
var headless = require('headless');

headless(function(err, childProcess, servernum) {
  // childProcess is a ChildProcess, as returned from child_process.spawn()
  console.log('Xvfb running on server number', servernum);
  console.log('Xvfb pid', childProcess.pid);
  console.log('err should be null', err);
});
````

headless also support an optional number to start searching from.

````javascript
var headless = require('headless');

headless(200, function(err, childProcess, servernum) {
  // servernum will be at least 200
  console.log('Xvfb running on server number', servernum);
  console.log('Xvfb pid', childProcess.pid);
});
````

install
=======

With [npm](http://npmjs.org), do:

    npm install headless