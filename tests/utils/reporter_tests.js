'use strict';

var Bluebird = require('bluebird');
var expect = require('chai').expect;
var sinon = require('sinon');
var tmp = require('tmp');

var tmpNameAsync = Bluebird.promisify(tmp.tmpName);

var Reporter = require('../../lib/utils/reporter');
var FakeReporter = require('../support/fake_reporter');

describe('Reporter', function() {
  function mockApp(reporter) {
    reporter = reporter || new FakeReporter();

    return {
      config: {
        get: function(key) {
          switch (key) {
            case 'reporter':
              return reporter;
          }
        }
      }
    };
  }

  var sandbox;

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
        return new Reporter(mockApp(), process.stdout, path);
      }).then(function(reporter) {
        expect(reporter.reportFile).to.exist();

        close = sandbox.spy(reporter.reportFile, 'close');

        return reporter.close();
      }).then(function() {
        expect(close).to.have.been.called();
      });
    });

    // Regresses https://github.com/testem/testem/issues/900
    it('uses file stream when reporting', function() {
      var tapReporterSpy = sandbox.spy(require('../../lib/reporters'), 'tap');
      var reporter = new Reporter(mockApp('tap'), process.stdout, 'report.xml');

      expect(reporter.reportFileStream).to.not.be.undefined();
      expect(reporter.reportFileStream).to.not.equal(process.stdout,
          'expected report file stream to not be process.stdout');

      sinon.assert.calledWithMatch(tapReporterSpy,
        sinon.match.any,
        sinon.match.same(reporter.reportFileStream),
        sinon.match.any,
        sinon.match.any);
    });
  });

  describe('with', function() {
    var app = mockApp();

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
