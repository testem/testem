'use strict';

var os = require('os').type();
var path = require('path');
var shell = require('shelljs');
var Bluebird = require('bluebird');
var retry = require('bluebird-retry');
var tmp = require('tmp');
var rimraf = require('rimraf');

var rimrafAsync = Bluebird.promisify(rimraf);
var tmpDirAsync = Bluebird.promisify(tmp.dir);

// skip node@0.10, because of npm@1
// and inability to pass arguments
// to npm run-script commands
var version = process.version.match(/^v(\d+)\.(\d+).(\d+)/);
if (version[1] < 1 && version[2] < 12) {
  console.info('Integration auto testing supports node@0.12+', version);
  process.exit(0);
}

// get extra params
var argv = process.argv.slice(2);
var testFlags = (argv.length ? ' ' + argv.join(' ') : '') + ' -p 0';
var testCmd = 'npm run test -- ' + testFlags;

// special examples, require human intervention
var skipExamples = ['browserstack', 'saucelabs'];
var skipOnWindows = [
  'coffeescript', // File not found: C:\projects\testem\examples\coffeescript\*.coffee
  'webpack' // 'webpack' is not recognized as an internal or external command, operable program or batch file.
];
var skipDefiningReporter = [
  'node_example',
  'node_tap_example'
];
var examplesPath = path.join(__dirname, '../examples');
var DEFAULT_CONCURRENY = 10;
var concurrency = parseInt(process.env.INTEGRATION_TESTS_CONCURRENCY || DEFAULT_CONCURRENY);

// show available launchers
shell.exec('node testem.js launchers');
shell.echo('');
shell.echo('Testing with flags:' + (testFlags || '[no custom flags provided]'));
shell.echo('');

// run examples tests
testExamples(shell.ls(examplesPath), function(err) {
  if (err) {
    shell.echo(err);
    process.exit(1);
  }
});

// test examples one by one, async
function testExamples(examples, callback) {
  Bluebird.map(examples, testExample, { concurrency: concurrency }).asCallback(callback);
}

function tmpDir() {
  return tmpDirAsync().disposer(function(path) {
    return rimrafAsync(path);
  });
}

function shellExec(cmd, runOpts) {
  return Bluebird.fromCallback(function(callback) {
    return shell.exec(cmd, runOpts, function(exitCode, output) {
      if (exitCode) {
        return callback(new Error(
          'Cmd: ' + cmd + ' failed with exit code: ' + exitCode + '\n' + output
        ));
      }
      callback(null, output);
    });
  });
}

function testExample(example) {
  if (skipExamples.indexOf(example) !== -1) {
    // proceed to the next one
    return;
  }

  if (os === 'Windows_NT' && skipOnWindows.indexOf(example) !== -1) {
    // proceed to the next one
    return;
  }

  var examplePath = path.join(examplesPath, example);
  var runOpts = {silent: true, cwd: examplePath};

  return Bluebird.using(tmpDir(), function(cachePath) {
    return retry(npmInstall(cachePath, runOpts), { max_tries: 3 }).then(function() {
      var cmd = testCmd;
      if (skipDefiningReporter.indexOf(example) === -1) {
        cmd += ' --launch phantomjs';
      }

      return retry(runExample(cmd, runOpts), { max_tries: 3 });
    }).then(function(testOuput) {
      // output test results
      shell.echo('Testing ' + example);
      shell.echo(testOuput);
    });
  });
}

function runExample(cmd, runOpts) {
  return function() {
    return shellExec(cmd, runOpts);
  };
}

function npmInstall(cachePath, runOpts) {
  return function() {
    return shellExec('npm install --cache=' + cachePath, runOpts);
  };
}
