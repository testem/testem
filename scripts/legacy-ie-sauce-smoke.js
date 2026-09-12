#!/usr/bin/env node

/**
 * Sauce Labs IE 11 smoke for two ES5 examples (jasmine_simple, babel).
 * Skips locally when Sauce credentials are unset. Fails in CI without them.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const yaml = require('js-yaml');
const { execa } = require('execa');

const root = path.join(__dirname, '..');
const testem = path.join(root, 'testem.js');
const sauceDir = path.join(root, 'examples', 'saucelabs');
const TIMEOUT = 240000;
const EXAMPLES = [
  { name: 'jasmine_simple', needsInstall: false },
  { name: 'babel', needsInstall: true },
];

const SL_IE_11 = {
  exe: '../../node_modules/.bin/saucie',
  args: ['-b', 'internet explorer', '-v', '11', '--no-connect', '--attach', '-u'],
  protocol: 'browser',
};

function inCi() {
  return Boolean(process.env.CI || process.env.GITHUB_ACTIONS);
}

function hasSauceCreds() {
  return Boolean(process.env.SAUCE_USERNAME && process.env.SAUCE_ACCESS_KEY);
}

function exampleConfig(exampleName) {
  const exampleDir = path.join(root, 'examples', exampleName);
  if (exampleName === 'babel') {
    const yml = yaml.load(
      fs.readFileSync(path.join(exampleDir, 'testem.yml'), 'utf8'),
    );
    return Object.assign({ cwd: exampleDir }, yml);
  }
  return {
    cwd: exampleDir,
    framework: 'jasmine',
  };
}

function mergedConfig(exampleName) {
  const config = exampleConfig(exampleName);
  config.launchers = { SL_IE_11 };
  config.launch_in_ci = ['SL_IE_11'];
  config.browser_start_timeout = 90;
  config.disable_watching = true;
  return config;
}

async function withSauceTunnel(fn) {
  await execa('node', [path.join(sauceDir, 'saucie-connect.js')], {
    cwd: sauceDir,
    stdio: 'inherit',
    timeout: TIMEOUT,
  });
  try {
    await fn();
  } finally {
    try {
      await execa('node', [path.join(sauceDir, 'saucie-disconnect.js')], {
        cwd: sauceDir,
        stdio: 'inherit',
        timeout: 60000,
      });
    } catch (err) {
      console.error(
        'Sauce disconnect failed:',
        err.shortMessage || err.message || err,
      );
    }
  }
}

async function runExample(example) {
  const exampleDir = path.join(root, 'examples', example.name);
  if (example.needsInstall) {
    console.log('Installing ' + example.name + '...');
    await execa('npm', ['install'], {
      cwd: exampleDir,
      stdio: 'inherit',
      timeout: TIMEOUT,
    });
  }

  const tmpFile = path.join(
    os.tmpdir(),
    'testem-legacy-ie-' + example.name + '-' + process.pid + '.json',
  );
  fs.writeFileSync(tmpFile, JSON.stringify(mergedConfig(example.name), null, 2));

  try {
    console.log(
      'Running Testem CI with SL_IE_11 (examples/' + example.name + ')...',
    );
    await execa(
      'node',
      [testem, 'ci', '--file', tmpFile, '--launch', 'SL_IE_11', '-P', '10', '-p', '0'],
      {
        cwd: exampleDir,
        stdio: 'inherit',
        timeout: TIMEOUT,
      },
    );
  } finally {
    fs.rmSync(tmpFile, { force: true });
  }
}

async function main() {
  if (!hasSauceCreds()) {
    if (inCi()) {
      console.error('SAUCE_USERNAME and SAUCE_ACCESS_KEY are required in CI.');
      process.exit(1);
    }
    console.log('Skipping: Sauce credentials are not set.');
    process.exit(0);
  }

  await withSauceTunnel(async () => {
    for (const example of EXAMPLES) {
      await runExample(example);
    }
  });
}

main().catch((err) => {
  console.error('Sauce IE CI smoke failed:', err.shortMessage || err.message || err);
  process.exit(1);
});
