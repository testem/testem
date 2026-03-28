const os = require('os').type();
const path = require('path');
const fs = require('fs');
const { execa, execaSync } = require('execa');
const { mapLimit, retry } = require('../lib/utils/promises');

// get extra params
const argv = process.argv.slice(2);
const testFlags = (argv.length ? ' ' + argv.join(' ') : '') + ' -p 0';
const testCmd = 'npm run test -- ' + testFlags;

const skipExamples = [
  'browserstack', // requires credentials and doesn't work in CI
  'saucelabs',  // requires credentials and doesn't work in CI
  'template_stealjs', // not being maintained
];
const skipOnWindows = [
  'coffeescript', // File not found: C:\projects\testem\examples\coffeescript\*.coffee
  'webpack' // 'webpack' is not recognized as an internal or external command, operable program or batch file.
];
const skipDefiningReporter = [
  'node_example',
  'node_tap_example',
  'electron'
];
const examplesPath = path.join(__dirname, '../examples');
const DEFAULT_CONCURRENY = 5;
const TIMEOUT = 180000; // npm install is sometimes really slow...
const RETRIES = 3;
const concurrency = parseInt(process.env.INTEGRATION_TESTS_CONCURRENCY || DEFAULT_CONCURRENY);

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
  const opts = { cwd: runOpts.cwd, timeout: runOpts.timeout, shell: true };
  try {
    const result = await execa(cmd, opts);
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

  const examplePath = path.join(examplesPath, example);
  const runOpts = {silent: true, cwd: examplePath, timeout: TIMEOUT};

  return retry(npmInstall(runOpts), { max_tries: RETRIES }).then(function() {
    let cmd = testCmd;
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
