#!/usr/bin/env node

const path = require('path');
const { spawn } = require('child_process');
const Config = require('../lib/config');

const root = path.join(__dirname, '..');
const configFile = path.join(root, 'testem.dogfood.js');
const BROWSERS = ['Chrome', 'Firefox', 'Safari'];
const MOCHA = 'Mocha';

function parseDogfoodArgs(argv) {
  return {
    mochaOnly: argv.includes('--mocha-only') || argv.includes('--skip-browsers')
  };
}

function selectLaunchers(available, options) {
  const wanted = options.mochaOnly ? [MOCHA] : BROWSERS.concat(MOCHA);
  const launch = [];
  const skipped = [];
  wanted.forEach((name) => {
    if (available[name.toLowerCase()]) {
      launch.push(name);
    } else {
      skipped.push(name);
    }
  });
  return { launch, skipped };
}

function startDashboard(launch) {
  const child = spawn(
    process.execPath,
    [
      path.join(root, 'testem.js'),
      '-f',
      configFile,
      '--launch',
      launch.join(','),
      '-d'
    ],
    {
      cwd: root,
      stdio: 'inherit'
    }
  );
  child.on('exit', (code, signal) => {
    if (signal) {
      process.exit(1);
    }
    process.exit(code === null || code === undefined ? 1 : code);
  });
}

function main() {
  if (!process.stdout.isTTY) {
    const stream = process.stdout;
    stream.write('Not a TTY; use testem ci\n');
    process.exit(1);
  }

  const options = parseDogfoodArgs(process.argv.slice(2));
  const config = new Config('dev', { file: configFile });
  config.read(() => {
    config.getAvailableLaunchers((err, available) => {
      if (err) {
        console.error(err.message || err);
        process.exit(1);
      }

      const { launch, skipped } = selectLaunchers(available, options);
      skipped.forEach((name) => {
        console.warn('Skipping ' + name + ' (not installed).');
      });

      if (launch.indexOf(MOCHA) === -1) {
        console.error('Launcher "Mocha" is missing from testem.dogfood.js.');
        process.exit(1);
      }
      if (launch.length === 0) {
        console.error('No launchers available.');
        process.exit(1);
      }

      console.log('Launching ' + launch.join(', ') + '.');
      startDashboard(launch);
    });
  });
}

if (require.main === module) {
  main();
}

module.exports = {
  BROWSERS,
  MOCHA,
  parseDogfoodArgs,
  selectLaunchers
};
