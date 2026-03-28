

const fs = require('fs');

const dirsToClean = new Set();

process.on('exit', () => {
  for (const dir of dirsToClean) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch (_) {
      // Best-effort cleanup: ignore errors during process exit
    }
  }
});

function registerCleanup(dir) {
  dirsToClean.add(dir);
}

module.exports = { registerCleanup };
