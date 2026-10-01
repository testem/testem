#!/usr/bin/env node
import path from "node:path";
import { realpathSync } from "node:fs";
import { spawn } from "node:child_process";
import Config from "../lib/config.js";
import { fileURLToPath } from "node:url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function isCliEntry() {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  try {
    return realpathSync(__filename) === realpathSync(entry);
  } catch {
    return false;
  }
}

const root = path.join(__dirname, '..');
const configFile = path.join(root, 'testem.dogfood.cjs');
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
        console.error('Launcher "Mocha" is missing from testem.dogfood.cjs.');
        process.exit(1);
      }
      if (launch.length === 0) {
        console.error('No launchers available.');
        process.exit(1);
      }

      console.log('Launching ' + launch.join(', ') + '.');
      console.log('Browser tabs: dogfood fixture (failures + console for paging). Mocha is the unit suite as TAP.');
      startDashboard(launch);
    });
  });
}

if (isCliEntry()) {
  main();
}

export { BROWSERS };
export { MOCHA };
export { parseDogfoodArgs };
export { selectLaunchers };