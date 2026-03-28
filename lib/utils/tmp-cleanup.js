

const fs = require('fs');

const dirsToClean = new Set();

process.on('exit', () => {
  for (const dir of dirsToClean) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // Best-effort cleanup: ignore errors during process exit
    }
  }
});

// Allow graceful cleanup when the process is terminated by a signal.
// Calling process.exit() ensures the 'exit' event fires and cleanup runs.
process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT',  () => process.exit(130));

function registerCleanup(dir) {
  dirsToClean.add(dir);
}

module.exports = { registerCleanup, _registeredDirs: dirsToClean };
