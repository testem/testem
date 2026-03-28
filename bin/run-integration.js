

var os = require('os').type();
var path = require('path');
var fs = require('fs');
var { execa, execaSync } = require('execa');
var { mapLimit, retry } = require('../lib/utils/promises');

// get extra params
var argv = process.argv.slice(2);
var testFlags = (argv.length ? ' ' + argv.join(' ') : '') + ' -p 0';
var testCmd = 'npm run test -- ' + testFlags;

var skipExamples = [
  'browserstack', // requires credentials and doesn't work in CI
  'saucelabs',  // requires credentials and doesn't work in CI
  'template_stealjs', // not being maintained
];
var skipOnWindows = [
  'coffeescript', // File not found: C:\projects\testem\examples\coffeescript\*.coffee
  'webpack' // 'webpack' is not recognized as an internal or external command, operable program or batch file.
];
var skipDefiningReporter = [
  'node_example',
  'node_tap_example',
  'electron'
];
var examplesPath = path.join(__dirname, '../examples');
var DEFAULT_CONCURRENY = 5;
var TIMEOUT = 180000; // npm install is sometimes really slow...
var RETRIES = 3;
var concurrency = parseInt(process.env.INTEGRATION_TESTS_CONCURRENCY || DEFAULT_CONCURRENY);

// show available launchers
execaSync('node', ['testem.js', 'launchers'], { stdio: 'inherit' });
console.log('');
console.log('Testing with flags:' + (testFlags || '[no custom flags provided]'));
console.log('');

// run examples tests
testExamples(fs.readdirSync(examplesPath), function(err) {
  if (err) {
    console.log(err);
    process.exit(1);
  }
});

// test examples one by one, async
function testExamples(examples, callback) {
  mapLimit(examples, concurrency, testExample).then(() => callback(), callback);
}

async function shellExec(cmd, runOpts) {
  var opts = { cwd: runOpts.cwd, timeout: runOpts.timeout, shell: true };
  try {
    var result = await execa(cmd, opts);
    return result.stdout;
  } catch (err) {
    throw new Error(
      'Cmd: ' + cmd + ' in directory: ' + path.basename(runOpts.cwd) + ' failed with exit code: ' + err.exitCode + '\n' + err.stdout + err.stderr
    );
  }
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
  var runOpts = {silent: true, cwd: examplePath, timeout: TIMEOUT};

  return retry(npmInstall(runOpts), { max_tries: RETRIES }).then(function() {
    var cmd = testCmd;
    if (skipDefiningReporter.indexOf(example) === -1) {
      cmd += ' --launch "Headless Firefox"';
    }

    return retry(runExample(cmd, runOpts), { max_tries: RETRIES });
  }).then(function(testOutput) {
    // output test results
    console.log('Testing ' + example);
    console.log(testOutput);
  }).catch(function(err) {
    // output error
    console.log('Testing ' + example + ' failed');
    throw err;
  });
}

function runExample(cmd, runOpts) {
  return function() {
    return shellExec(cmd, runOpts);
  };
}

function npmInstall(runOpts) {
  return function() {
    return shellExec('npm install', runOpts);
  };
}
