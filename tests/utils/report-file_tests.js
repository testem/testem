'use strict';

var Bluebird = require('bluebird');
var expect = require('chai').expect;
var tmp = require('tmp');
var Writable = require('stream').Writable;

var tmpNameAsync = Bluebird.promisify(tmp.tmpName);

var ReportFile = require('../../lib/utils/report-file');

describe('ReportFile', function() {
  describe('close', function() {
    it('resolves when all data has been written', function() {

      var noopStream = new Writable();
      noopStream._write = function(chunk, encoding, done) {
        done();
      };

      var finished = false;

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
