

// Spawned as a child process by tmp-cleanup_tests.js to verify that
// registerCleanup removes the directory when the process exits.

const fs = require('fs');
const os = require('os');
const path = require('path');

const { registerCleanup } = require('../../lib/utils/tmp-cleanup');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'testem-cleanup-test-'));
registerCleanup(dir);

// Print the path so the parent test can check it after we exit.
process.stdout.write(dir + '\n');
