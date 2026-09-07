

const fs = require('fs');
const path = require('path');
const PassThrough = require('stream').PassThrough;
module.exports = class ReportFile {
  constructor(reportFile) {
    this.file = reportFile;

    this.outputStream = new PassThrough();

    fs.mkdirSync(path.dirname(path.resolve(reportFile)), { recursive: true });

    this.outputStream = fs.createWriteStream(reportFile, { flags: 'w+' });

    this.closePromise = new Promise((resolve, reject) => {
      this.outputStream.on('finish', resolve);
      this.outputStream.on('error', reject);
    });

    // The stream can fail long before anything calls close() - opening an
    // unwritable report file rejects on the next tick. Attach a no-op handler
    // so that rejection is not reported as unhandled; close() still returns
    // closePromise, so the error is surfaced to the caller.
    this.closePromise.catch(() => {});
  }

  close() {
    this.outputStream.end();

    return this.closePromise;
  }
};
