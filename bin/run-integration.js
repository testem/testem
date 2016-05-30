'use strict';

var os = require('os').type();
var path = require('path');
var assert = require('assert');
var shell = require('shelljs');

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
var testFlags = argv.length ? ' ' + argv.join(' ') : '';

var testCmd = 'npm run test' + (testFlags ? ' -- ' + testFlags : '');

// special examples, require human intervention
var skipExamples = ['browserstack', 'saucelabs'];
var skipOnWindows = [
  'coffeescript', // File not found: C:\projects\testem\examples\coffeescript\*.coffee
  'webpack' // 'webpack' is not recognized as an internal or external command, operable program or batch file.
];
var examplesPath = path.join(__dirname, '../examples');

// show available launchers
shell.exec('node testem.js launchers');
shell.echo('');
shell.echo('Testing with flags:' + (testFlags || '[no custom flags provided]'));
shell.echo('');
shell.cd(examplesPath);

// run examples tests
testExamples(shell.ls('.'), function(code, output)
{
  if (output)
  {
    shell.echo(output);
  }

  // finish with the right code
  assert.equal(code, 0);
});

// test examples one by one, async
function testExamples(examples, callback)
{
  var example = examples.shift();

  if (!example) {
    // done here
    callback(0);
    return;
  }

  if (skipExamples.indexOf(example) !== -1) {
    // proceed to the next one
    testExamples(examples, callback);
    return;
  }

  if (os === 'Windows_NT' && skipOnWindows.indexOf(example) !== -1) {
    // proceed to the next one
    testExamples(examples, callback);
    return;
  }

  shell.echo('Testing ' + example);
  shell.cd(example);

  shell.exec('npm install', {silent: true}, function(installErrCode, installOutput) {
    // if error code, terminate
    // right here, right now
    if (installErrCode) {
      callback(installErrCode, installOutput);
      return;
    }

    shell.exec(testCmd, {silent: true}, function(testErrCode, testOuput)
    {
      var result;

      // if error code, terminate
      // right here, right now
      if (testErrCode) {
        callback(testErrCode, testOuput);
        return;
      }

      // output test results
      result = testOuput.match(/#[\s]+tests[\s]+[0-9]+[\s\S]+#[\s]+fail[\s]+[0-9]+/);
      shell.echo(result[0]);

      // step up back
      shell.cd(examplesPath);

      // proceed to the next one
      testExamples(examples, callback);
    });
  });
}
