// Spawned as a child process by launcher_tests.js to verify that the browser
// tmp directory is cleaned up when the process exits.

const Launcher = require('../../lib/launcher');
const Config = require('../../lib/config');

const config = new Config(null, { port: '7357', url: 'http://blah.com/' });
const launcher = new Launcher('test browser', { protocol: 'browser' }, config);
const dir = launcher.browserTmpDir();

// Print the path so the parent test can check it after we exit.
process.stdout.write(dir + '\n');

// Natural exit triggers process.on('exit') cleanup registered by the Launcher.
