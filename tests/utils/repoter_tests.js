'use strict';

var Bluebird = require('bluebird');
var expect = require('chai').expect;
var sinon = require('sinon');
var tmp = require('tmp');

var tmpNameAsync = Bluebird.promisify(tmp.tmpName);

var Reporter = require('../../lib/utils/reporter');
var FakeReporter = require('../support/fake_reporter');

describe('Reporter', function() {
  var sandbox;
  var app = {
    config: {
      get: function(key) {
        switch (key) {
          case 'reporter':
            return new FakeReporter();
        }
      }
    }
  };

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('new', function() {
    it('can report to a file', function() {
      var close;
      tmpNameAsync().then(function(path) {
        return new Reporter(app, process.stdout, path);
      }).then(function(reporter) {
        expect(reporter.reportFile).to.exist();

        close = sandbox.spy(reporter.reportFile, 'close');

        return reporter.close();
      }).then(function() {
        expect(close).to.have.been.called();
      });
    });
  });

  describe('with', function() {
    it('can be used as a disposable which returns a reporter', function() {
      return Bluebird.using(Reporter.with(app, process.stdout), function(reporter) {
        expect(reporter).to.be.an.instanceof(Reporter);
      });
    });

    it('closes the reporter when done', function() {
      var close;
      return Bluebird.using(Reporter.with(app, process.stdout), function(reporter) {
        close = sandbox.spy(reporter, 'close');
      }).then(function() {
        expect(close).to.have.been.called();
      });
    });

    it('logs an error when the wrapped promise was rejected', function() {
      var report;

      return Bluebird.using(Reporter.with(app, process.stdout), function(reporter) {
        report = sandbox.spy(reporter.reporter, 'report');
        return Bluebird.reject(new Error('Tests failed.'));
      }).catch(function() {
        expect(report).to.have.been.calledWith(null, {
          error: { message: 'Tests failed.' }, name: 'Error', passed: false
        });
      });
    });
  });
});
