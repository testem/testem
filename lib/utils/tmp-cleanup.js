

const fs = require('fs');

const dirsToClean = new Set();

process.on('exit', () => {
  for (const dir of dirsToClean) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function registerCleanup(dir) {
  dirsToClean.add(dir);
}

module.exports = { registerCleanup };
