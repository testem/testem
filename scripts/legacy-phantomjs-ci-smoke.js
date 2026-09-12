#!/usr/bin/env node

/**
 * PhantomJS smoke for two ES5 examples (jasmine_simple, babel).
 * Skips when PhantomJS is not installed unless LEGACY_BROWSERS_REQUIRED=PhantomJS.
 */

const path = require('path');
const { execa } = require('execa');
const Config = require('../lib/config');

const root = path.join(__dirname, '..');
const testem = path.join(root, 'testem.js');
const TIMEOUT = 180000;
const EXAMPLES = [
  { name: 'jasmine_simple', needsInstall: false },
  { name: 'babel', needsInstall: true },
];

function getAvailableLaunchers() {
  return new Promise((resolve, reject) => {
    const config = new Config('ci', {});
    config.getAvailableLaunchers((err, launchers) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(launchers);
    });
  });
}

function requiredPhantom() {
  return String(process.env.LEGACY_BROWSERS_REQUIRED || '').toLowerCase() === 'phantomjs';
}

async function main() {
  const launchers = await getAvailableLaunchers();
  if (!launchers.phantomjs) {
    const message = 'PhantomJS is not installed.';
    if (requiredPhantom()) {
      console.error(message + ' LEGACY_BROWSERS_REQUIRED=PhantomJS.');
      process.exit(1);
    }
    console.log('Skipping: ' + message);
    process.exit(0);
  }

  for (const example of EXAMPLES) {
    const exampleDir = path.join(root, 'examples', example.name);
    if (example.needsInstall) {
      console.log('Installing ' + example.name + '...');
      await execa('npm', ['install'], {
        cwd: exampleDir,
        stdio: 'inherit',
        timeout: TIMEOUT,
      });
    }

    console.log('Running Testem CI with PhantomJS (examples/' + example.name + ')...');
    await execa('node', [testem, 'ci', '--launch', 'PhantomJS', '-P', '10', '-p', '0'], {
      cwd: exampleDir,
      stdio: 'inherit',
      timeout: TIMEOUT,
    });
  }
}

main().catch((err) => {
  console.error('PhantomJS CI smoke failed:', err.shortMessage || err.message || err);
  process.exit(1);
});
