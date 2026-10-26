import { expect } from "chai";
import sinon from "sinon";
import fs from "node:fs";
import { PassThrough } from "node:stream";
import { tmpNameAsync } from "../support/tmp-name.js";
import readStream from "../support/read-stream.js";
import Reporter from "../../lib/utils/reporter.js";
import FakeReporter from "../support/fake_reporter.js";
import TapReporter from "../../lib/reporters/tap_reporter.js";
import XUnitReporter from "../../lib/reporters/xunit_reporter.js";
import reporters from "../../lib/reporters/index.js";
import log from "../../lib/log.js";

const fsReadFileAsync = (path, enc) => fs.promises.readFile(path, enc);
const fsUnlinkAsync = path => fs.promises.unlink(path);

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

  let sandbox, stream;

  beforeEach(function() {
    sandbox = sinon.createSandbox();
    stream = new PassThrough();
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('"new"', function() {
    it('can report to a file', function() {
      let close;
      tmpNameAsync().then(function(path) {
        return new Reporter(mockApp(), stream, path);
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
      let tapReporterSpy = sandbox.spy(reporters, 'tap');
      let reporter = new Reporter(mockApp('tap'), stream, 'report.xml');

      expect(reporter.reportFile).to.not.be.undefined();

      sinon.assert.calledWithMatch(tapReporterSpy,
        sinon.match.any,
        sinon.match.same(reporter.reportFile.outputStream),
        sinon.match.any,
        sinon.match.any);

      return reporter.close().then(function() {
        return fsUnlinkAsync('report.xml');
      });
    });
  });

  describe('"with"', function() {
    let app = mockApp();

    it('passes a reporter to the callback', function() {
      return Reporter.with(app, stream, undefined, function(reporter) {
        expect(reporter).to.be.an.instanceof(Reporter);
      });
    });

    it('closes the reporter when done', function() {
      let close;
      return Reporter.with(app, stream, undefined, function(reporter) {
        close = sandbox.spy(reporter, 'close');
      }).then(function() {
        expect(close).to.have.been.called();
      });
    });

    it('closes the reporter when promise is rejected with error hidden from the reporter', function() {
      let close;
      return Reporter.with(app, stream, undefined, function(reporter) {
        close = sandbox.spy(reporter, 'close');

        let mockError = new Error('Not all tests passed.');
        mockError.hideFromReporter = true;
        return Promise.reject(mockError);
      }).catch(function() {
        expect(close).to.have.been.called();
      });
    });

    it('logs an error when the wrapped promise was rejected', function() {
      let report;

      return Reporter.with(app, stream, undefined, function(reporter) {
        report = sandbox.spy(reporter, 'report');
        return Promise.reject(new Error('Tests failed.'));
      }).catch(function() {
        expect(report).to.have.been.calledWith(null, {
          error: { message: 'Tests failed.' }, name: 'Error', passed: false
        });
      });
    });

    it('keeps the callback error when close fails', function() {
      let err = new Error('Tests failed.');
      let report;
      let close;

      return Reporter.with(app, stream, undefined, function(reporter) {
        report = sandbox.spy(reporter, 'report');
        close = sandbox.stub(reporter, 'close').rejects(new Error('close failed'));
        return Promise.reject(err);
      }).then(function() {
        expect('should have rejected').to.equal(false);
      }).catch(function(e) {
        expect(e).to.equal(err);
        expect(report).to.have.been.called();
        expect(close).to.have.been.called();
      });
    });

    it('keeps the callback error when report throws', function() {
      let err = new Error('Tests failed.');
      let close;

      return Reporter.with(app, stream, undefined, function(reporter) {
        sandbox.stub(reporter, 'report').throws(new Error('report failed'));
        close = sandbox.spy(reporter, 'close');
        return Promise.reject(err);
      }).then(function() {
        expect('should have rejected').to.equal(false);
      }).catch(function(e) {
        expect(e).to.equal(err);
        expect(close).to.have.been.called();
      });
    });

    it('rejects with the close error when the callback succeeds', function() {
      let closeErr = new Error('close failed');

      return Reporter.with(app, stream, undefined, function(reporter) {
        sandbox.stub(reporter, 'close').rejects(closeErr);
      }).then(function() {
        expect('should have rejected').to.equal(false);
      }).catch(function(e) {
        expect(e).to.equal(closeErr);
      });
    });
  });

  describe('new', function() {
    it('creates a reporter and writes to stream', function() {
      let reporter = new Reporter({
        config: {
          get: function(key) {
            switch (key) {
              case 'reporter':
                return 'tap';
            }
          }
        }
      }, stream);

      expect(reporter.reporters.length).to.eq(1);

      reporter.report('phantomjs', {
        name: 'it does <cool> "cool" \'cool\' stuff',
        passed: true
      });
      reporter.finish();

      let output = readStream(stream);
      expect(output).to.match(/tests 1/);
    });

    it('creates two reporters and writes to stream and path when path provided', function() {
      return tmpNameAsync().then(function(path) {
        let stream = new PassThrough();
        let reporter = new Reporter({
          config: {
            get: function(key) {
              switch (key) {
                case 'reporter':
                  return 'tap';
              }
            }
          }
        }, stream, path);

        reporter.report('phantomjs', {
          name: 'it does <cool> "cool" \'cool\' stuff',
          passed: true
        });

        reporter.finish();

        return reporter.close().then(function() {
          let output = readStream(stream);
          expect(output).to.match(/tests 1/);

          return fsReadFileAsync(path, 'utf-8');
        }).then(function(output) {
          expect(output).to.match(/tests 1/);
        });
      });
    });

    it('creates two reporters in dev mode if path is present and 2nd reporter is tap', function() {
      return tmpNameAsync().then(function(path) {
        let stream = new PassThrough();
        let reporter = new Reporter({
          config: {
            appMode: 'dev',
            get: function(key) {
              switch (key) {
                case 'reporter':
                  return FakeReporter;
                case 'path':
                  return 'dev';
                case 'url':
                  return 'abc';
              }
            }
          },
          on: () => {},
        }, stream, path);

        expect(reporter.reporters).to.have.lengthOf(2);
        expect(reporter.reporters[0]).to.be.an.instanceof(FakeReporter);
        expect(reporter.reporters[1]).to.be.an.instanceof(TapReporter);
      });
    });

    it('creates two reporters in dev mode if path is present and 2nd reporter is dev_mode_file_reporter', function() {
      return tmpNameAsync().then(function(path) {
        let stream = new PassThrough();
        let reporter = new Reporter({
          config: {
            appMode: 'dev',
            get: function(key) {
              switch (key) {
                case 'reporter':
                  return FakeReporter;
                case 'path':
                  return 'dev';
                case 'dev_mode_file_reporter':
                  return 'xunit';
                case 'url':
                  return 'abc';
              }
            }
          },
          on: () => {},
        }, stream, path);

        expect(reporter.reporters).to.have.lengthOf(2);
        expect(reporter.reporters[0]).to.be.an.instanceof(FakeReporter);
        expect(reporter.reporters[1]).to.be.an.instanceof(XUnitReporter);
      });
    });

    it('creates a reporter when custom reporter dependent on configs is provided', function() {
      class CustomReporter extends TapReporter {
      }

      let config = { get: sinon.stub() };
      config.get.withArgs('reporter').returns(CustomReporter);
      config.get.withArgs('tap_quiet_logs').returns(true);
      let app = { config: config };
      let reporter = new Reporter(app, stream);

      expect(reporter).to.be.ok();
      expect(reporter.reporters.length).to.equal(1);
      expect(reporter.reporters[0].quietLogs).to.be.true();
    });

    it('does not register a custom reporter instance twice when path is provided', function() {
      return tmpNameAsync().then(function(path) {
        let custom = { report: sinon.spy(), finish: sinon.spy() };
        let warn = sandbox.stub(log, 'warn');
        let reporter = new Reporter(mockApp(custom), stream, path);

        expect(reporter.reporters).to.deep.equal([custom]);
        expect(warn).to.have.been.calledOnce();
        expect(warn.firstCall.args[0]).to.match(/report_file/);

        reporter.report('Chrome', { name: 'a test', passed: true });

        return reporter.close().then(function() {
          expect(custom.report).to.have.been.calledOnce();
          expect(custom.finish).to.have.been.calledOnce();
        });
      });
    });

    it('writes to stream and path with a custom reporter class when path is provided', function() {
      class CustomReporter {
        constructor(silent, out) {
          this.out = out;
        }

        report(prefix, data) {
          this.out.write(`${prefix} ${data.name}\n`);
        }
      }

      return tmpNameAsync().then(function(path) {
        let reporter = new Reporter(mockApp(CustomReporter), stream, path);

        expect(reporter.reporters).to.have.lengthOf(2);

        reporter.report('Chrome', { name: 'a test', passed: true });

        return reporter.close().then(function() {
          expect(readStream(stream)).to.equal('Chrome a test\n');

          return fsReadFileAsync(path, 'utf-8');
        }).then(function(output) {
          expect(output).to.equal('Chrome a test\n');
        });
      });
    });

    it('writes xml to stream and file with xunit reporter and intermediate output is enabled', function() {
      return tmpNameAsync().then(function(path) {
        let stream = new PassThrough();
        let reporter = new Reporter({
          config: {
            get: function(key) {
              switch (key) {
                case 'reporter':
                  return 'xunit';
                case 'xunit_intermediate_output':
                  return false;
              }
            }
          }
        }, stream, path);

        reporter.report('phantomjs', {
          name: 'it does <cool> "cool" \'cool\' stuff',
          passed: true
        });
        reporter.finish();

        return reporter.close().then(function() {
          let output = readStream(stream);
          expect(output).to.match(/<testsuite name/);

          return fsReadFileAsync(path, 'utf-8');
        }).then(function(output) {
          expect(output).to.match(/<testsuite name/);
        });
      });
    });

    it('writes tap to stream and xml to file with xunit reporter intermediate output is enabled', function() {
      return tmpNameAsync().then(function(path) {
        let stream = new PassThrough();
        let reporter = new Reporter({
          config: {
            get: function(key) {
              switch (key) {
                case 'reporter':
                  return 'xunit';
                case 'xunit_intermediate_output':
                  return true;
              }
            }
          }
        }, stream, path);

        reporter.report('phantomjs', {
          name: 'it does <cool> "cool" \'cool\' stuff',
          passed: true
        });
        reporter.finish();

        return reporter.close().then(function() {
          let output = readStream(stream);
          expect(output).to.match(/tests 1/);

          return fsReadFileAsync(path, 'utf-8');
        }).then(function(output) {
          expect(output).to.match(/<testsuite name/);
        });
      });
    });
  });

  describe('hasPassed', function() {
    let app = mockApp();
    let reporter;

    beforeEach(function() {
      reporter = new Reporter(app, stream);
    });

    it('returns true when all tests passed', function() {
      reporter.report('test', { passed: 1 });

      expect(reporter.hasPassed()).to.be.true();
    });

    it('returns true when all tests skipped', function() {
      let reporter = new Reporter(app, stream);

      reporter.report('test', { skipped: 1 });

      expect(reporter.hasPassed()).to.be.true();
    });

    it('returns true when all tests skipped or passed', function() {
      let reporter = new Reporter(app, stream);

      reporter.report('test', { passed: 1 });
      reporter.report('test', { skipped: 1 });

      expect(reporter.hasPassed()).to.be.true();
    });

    it('returns false when not all passed / skipped', function() {
      let reporter = new Reporter(app, stream);

      reporter.report('test', { passed: 1 });
      reporter.report('test', { skipped: 1 });
      reporter.report('test', { });

      expect(reporter.hasPassed()).to.be.false();
    });
  });

  describe('hasTests', function() {
    let app = mockApp();
    let reporter;

    beforeEach(function() {
      reporter = new Reporter(app, stream);
    });

    it('returns false without reported tests', function() {
      let reporter = new Reporter(app, stream);

      expect(reporter.hasTests()).to.be.false();
    });

    it('returns true when tests were reported', function() {
      reporter.report('test', {});

      expect(reporter.hasTests()).to.be.true();
    });
  });

  describe('setErrorPopupMessage', function() {
    it('forwards to the first reporter that implements it', function() {
      const first = { setErrorPopupMessage: sandbox.spy() };
      const second = { setErrorPopupMessage: sandbox.spy() };
      const reporter = new Reporter(mockApp(first), stream);
      reporter.reporters = [first, second];

      reporter.setErrorPopupMessage('too many files');

      expect(first.setErrorPopupMessage).to.have.been.calledOnce();
      expect(first.setErrorPopupMessage).to.have.been.calledWith('too many files');
      expect(second.setErrorPopupMessage).not.to.have.been.called();
    });

    it('skips reporters that do not implement it', function() {
      const tapLike = {};
      const popup = { setErrorPopupMessage: sandbox.spy() };
      const reporter = new Reporter(mockApp(tapLike), stream);
      reporter.reporters = [tapLike, popup];

      reporter.setErrorPopupMessage('EMFILE');

      expect(popup.setErrorPopupMessage).to.have.been.calledOnce();
      expect(popup.setErrorPopupMessage).to.have.been.calledWith('EMFILE');
    });

    it('does nothing when no reporter implements it', function() {
      const reporter = new Reporter(mockApp(), stream);

      expect(function() {
        reporter.setErrorPopupMessage('EMFILE');
      }).not.to.throw();
    });
  });

  describe('testsPlanned', function() {
    it('forwards to every reporter that implements it', function() {
      const first = { testsPlanned: sandbox.spy() };
      const plain = {};
      const reporter = new Reporter(mockApp(first), stream);
      reporter.reporters = [first, plain];

      reporter.testsPlanned('Chrome', { launcherId: 1, total: 3 });

      expect(first.testsPlanned).to.have.been.calledOnce();
      expect(first.testsPlanned).to.have.been.calledWith('Chrome', { launcherId: 1, total: 3 });
    });

    it('does not change the reported totals', function() {
      const reporter = new Reporter(mockApp(), stream);

      reporter.testsPlanned('Chrome', { launcherId: 1, total: 3 });

      expect(reporter.hasTests()).to.equal(false);
    });
  });
});
