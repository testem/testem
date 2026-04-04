

var expect = require('chai').expect;
var path = require('path');

var Config = require('../../lib/config');
var Launcher = require('../../lib/launcher.js');
var ProcessTestRunner = require('../../lib/runners/process_test_runner');

var FakeReporter = require('../support/fake_reporter');
const isWin = require('../../lib/utils/is-win')();

describe('ProcessTestRunner', function() {
  var reporter, config;

  beforeEach(function() {
    reporter = new FakeReporter();
    config = new Config('ci', {
      reporter: reporter
    });
  });

  it('calls onStart & onEnd', function(done) {
    var settings = {
      exe: 'node',
      args: [path.join(__dirname, '../fixtures/processes/stdout.js')]
    };
    var launcher = new Launcher('node-stdout', settings, config);
    var runner = new ProcessTestRunner(launcher, reporter);

    var startCalled = false;
    reporter.onStart = function(name, opts) {
      expect(name).to.equal('node-stdout');
      expect(opts).to.deep.equal({ launcherId: launcher.id });
      startCalled = true;
    };
    var endCalled = false;
    reporter.onEnd = function(name, opts) {
      expect(name).to.equal('node-stdout');
      expect(opts).to.deep.equal({ launcherId: launcher.id });
      endCalled = true;
    };
    runner.start(function() {
      expect(startCalled).to.equal(true);
      expect(endCalled).to.equal(true);
      done();
    });
  });

  it('reads stdout into messages', function(done) {
    var settings = {
      exe: 'node',
      args: [path.join(__dirname, '../fixtures/processes/stdout.js')]
    };
    var launcher = new Launcher('node-stdout', settings, config);
    var runner = new ProcessTestRunner(launcher, reporter);

    runner.start(function() {
      expect(reporter.results).to.deep.equal([{
        result: {
          launcherId: launcher.id,
          logs: [{
            text: 'foobar',
            type: 'log'
          }],
          name: 'error',
          failed: 0,
          passed: 1,
          testContext: {},
        }
      }]);
      done();
    });
  });

  it('handles failing processes', function(done) {
    var settings = {
      exe: 'node',
      args: [path.join(__dirname, '../fixtures/processes/stderr.js')]
    };
    var launcher = new Launcher('node-stderr', settings, config);
    var runner = new ProcessTestRunner(launcher, reporter);

    runner.start(function() {
      expect(reporter.results).to.deep.equal([{
        result: {
          launcherId: launcher.id,
          logs: [{
            text: 'Non-zero exit code: 1',
            type: 'error'
          },
          {
            text: 'foobar',
            type: 'error'
          }],
          name: 'error',
          failed: 1,
          passed: 0,
          testContext: {},
          error: {
            message: 'Non-zero exit code: 1\nStderr: \n foobar\n'
          }
        }
      }]);
      done();
    });
  });

  describe('onFinish callback', function() {
    it('invokes the callback when the process exits', function(done) {
      var settings = {
        exe: 'node',
        args: [path.join(__dirname, '../fixtures/processes/stdout.js')]
      };
      var launcher = new Launcher('node-stdout', settings, config);
      var runner = new ProcessTestRunner(launcher, reporter);

      runner.start(function() {
        done();
      });
    });

    it('calls the callback with null as the first argument on success', function(done) {
      var settings = {
        exe: 'node',
        args: [path.join(__dirname, '../fixtures/processes/stdout.js')]
      };
      var launcher = new Launcher('node-stdout', settings, config);
      var runner = new ProcessTestRunner(launcher, reporter);

      runner.start(function(err) {
        expect(err).to.be.null();
        done();
      });
    });

    it('both the returned promise and the callback fire on the same run', function() {
      var settings = {
        exe: 'node',
        args: [path.join(__dirname, '../fixtures/processes/stdout.js')]
      };
      var launcher = new Launcher('node-stdout', settings, config);
      var runner = new ProcessTestRunner(launcher, reporter);
      var callbackCalled = false;

      var p = runner.start(function() {
        callbackCalled = true;
      });

      return p.then(function() {
        expect(callbackCalled).to.equal(true);
      });
    });
  });

  it('handles non existing processes', function(done) {
    var settings = {
      exe: 'nope-not-existing'
    };
    var launcher = new Launcher('nope-fail', settings, config);
    var runner = new ProcessTestRunner(launcher, reporter);

    runner.start(function() {
      let expectedMessage = '';
      let expectedLogs = [];

      if (runner.lastErr) {
        expectedMessage = runner.lastErr.toString();
      }

      if (runner.lastStderr) {
        expectedMessage += 'Stderr: \n ' + runner.lastStderr + '\n';
      }

      if (isWin) {
        expectedMessage = 'Non-zero exit code: 1';
        const expectedStdErr =
          `'nope-not-existing' is not recognized as an internal or external command,\r\noperable program or batch file.\r\n`;
        const expectedTexts = [ expectedMessage, expectedStdErr ];
        expectedTexts.forEach(expectedText => {
          expectedLogs.push({
            text: expectedText,
            type: 'error'
          });
        });
        expectedMessage = expectedTexts.join('\nStderr: \n ');
      } else {
        expectedLogs.push({
          text: expectedMessage,
          type: 'error'
        });
        if (runner.lastStderr) {
          expectedLogs.push({
            text: runner.lastStderr,
            type: 'error'
          });
        }
      }

      expect(reporter.results).to.deep.equal([{
        result: {
          launcherId: launcher.id,
          logs: expectedLogs,
          name: 'error',
          failed: 1,
          passed: 0,
          testContext: {},
          error: {
            message: expectedMessage + '\n'
          }
        }
      }]);
      done();
    });
  });
});
