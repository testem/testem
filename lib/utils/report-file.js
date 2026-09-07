

const fs = require('fs');
const path = require('path');
const PassThrough = require('stream').PassThrough;
module.exports = class ReportFile {
  constructor(reportFile) {
    this.file = reportFile;

    this.outputStream = new PassThrough();

    fs.mkdirSync(path.dirname(path.resolve(reportFile)), { recursive: true });

    this.outputStream = fs.createWriteStream(reportFile, { flags: 'w+' });

    let alreadyEnded = false;
    function finish(data) {
      if (!alreadyEnded) {
        alreadyEnded = true;
        this.outputStream.end(data);
      }
    }

    this.outputStream.on('end', finish);
    this.outputStream.on('error', finish);

    this.closePromise = new Promise((resolve, reject) => {
      this.outputStream.on('finish', resolve);
      this.outputStream.on('error', reject);
    });
  }

  close() {
    this.outputStream.end();

    return this.closePromise;
  }
};
