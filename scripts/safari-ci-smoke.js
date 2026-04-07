#!/usr/bin/env node

/**
 * Unattended Safari smoke for CI (macOS only).
 * If Safari showed the local-file open dialog (#1387), Testem would hang past the wall timeout.
 * The macOS launcher uses `open`, which exits immediately; Testem ignores that process exit
 * (ignoreProcessExit on the Safari launcher) so the run is not marked as a failure.
 */

const path = require('path');
const { execa } = require('execa');

const root = path.join(__dirname, '..');
const exampleDir = path.join(root, 'examples', 'qunit_simple');

async function main() {
  if (process.platform !== 'darwin') {
    console.log('Skipping: Safari CI smoke runs only on macOS (darwin).');
    process.exit(0);
  }

  console.log('Running Testem CI with Safari (examples/qunit_simple)...');

  await execa('node', [path.join(root, 'testem.js'), 'ci', '--launch', 'Safari', '-P', '10'], {
    cwd: exampleDir,
    stdio: 'inherit',
    timeout: 180000,
  });
}

main().catch((err) => {
  console.error('Safari CI smoke failed:', err.shortMessage || err.message || err);
  process.exit(1);
});
