

const expect = require('chai').expect;
const fs = require('fs');
const os = require('os');
const path = require('path');
const { randomBytes } = require('crypto');
const Writable = require('stream').Writable;

const tmpNameAsync = () =>
  fs.promises
    .mkdtemp(path.join(os.tmpdir(), 'report-file-tests-'))
    .then(dir => path.join(dir, randomBytes(8).toString('hex')));

const ReportFile = require('../../lib/utils/report-file');

describe('ReportFile', function() {
  describe('close', function() {
    it('resolves when all data has been written', function() {

      let noopStream = new Writable();
      noopStream._write = function(chunk, encoding, done) {
        done();
      };

      let finished = false;

      return tmpNameAsync().then(function(path) {
        return new ReportFile(path, noopStream);
      }).then(function(reportFile) {
        expect(reportFile.closePromise).to.exist();

        reportFile.outputStream.on('finish', function() {
          finished = true;
        });

        return reportFile.close();
      }).then(function() {
        expect(finished).to.be.true();
      });
    });
  });
});
