import { expect } from "chai";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Writable } from "node:stream";
import { tmpNameAsync } from "../support/tmp-name.js";
import ReportFile from "../../lib/utils/report-file.js";

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

    it('rejects with the write stream error when the file cannot be opened', function() {
      // Opening a directory for writing fails, so the write stream emits an
      // error before anything is ever written to it.
      let dir = fs.mkdtempSync(path.join(os.tmpdir(), 'testem-report-file-'));
      let reportFile = new ReportFile(dir);

      return reportFile.close().then(function() {
        throw new Error('close() should not have resolved');
      }, function(err) {
        expect(err.syscall).to.eq('open');
        expect(err.path).to.eq(dir);
      }).finally(function() {
        fs.rmSync(dir, { recursive: true, force: true });
      });
    });
  });
});
