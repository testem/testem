const os = require('os').type();
const path = require('path');
const fs = require('fs');
const { execa, execaSync } = require('execa');
const { mapLimit, retry } = require('../lib/utils/promises');

// get extra params
const argv = process.argv.slice(2);
const testFlags = (argv.length ? ` ${argv.join(' ')}` : '') + ' -p 0';
const testCmd = `npm run test -- ${testFlags}`;

const skipExamples = [
  'browserstack', // requires credentials and doesn't work in CI
  'saucelabs',  // requires credentials and doesn't work in CI
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
const concurrency = parseInt(process.env.INTEGRATION_TESTS_CONCURRENCY || DEFAULT_CONCURRENY, 10);

// show available launchers
execaSync('node', ['testem.js', 'launchers'], { stdio: 'inherit' });
console.log('');
console.log(`Testing with flags:${testFlags || '[no custom flags provided]'}`);
console.log('');

// run examples tests
testExamples(fs.readdirSync(examplesPath)).catch(err => {
  console.log(err);
  process.exit(1);
});

// test examples one by one, async
async function testExamples(examples) {
  await mapLimit(examples, concurrency, testExample);
}

async function shellExec(cmd, runOpts) {
  const opts = { cwd: runOpts.cwd, timeout: runOpts.timeout, shell: true };
  try {
    const result = await execa(cmd, opts);
    return result.stdout;
  } catch (err) {
    throw new Error(
      `Cmd: ${cmd} in directory: ${path.basename(runOpts.cwd)} failed with exit code: ${err.exitCode}\n${err.stdout}${err.stderr}`,
      { cause: err }
    );
  }
}

async function testExample(example) {
  if (skipExamples.includes(example)) {
    // proceed to the next one
    return;
  }

  if (os === 'Windows_NT' && skipOnWindows.includes(example)) {
    // proceed to the next one
    return;
  }

  const examplePath = path.join(examplesPath, example);
  const runOpts = { silent: true, cwd: examplePath, timeout: TIMEOUT };

  try {
    await retry(npmInstall(runOpts), { max_tries: RETRIES });

    let cmd = testCmd;
    if (!skipDefiningReporter.includes(example)) {
      cmd += ' --launch "Headless Firefox"';
    }

    const testOutput = await retry(runExample(cmd, runOpts), { max_tries: RETRIES });
    console.log(`Testing ${example}`);
    console.log(testOutput);
  } catch (err) {
    console.log(`Testing ${example} failed`);
    throw err;
  }
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
