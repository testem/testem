var expect = require('chai').expect;
var path = require('path');

var Config = require('../../lib/config');
var Launcher = require('../../lib/launcher.js');
var ProcessTestRunner = require('../../lib/runners/process_test_runner');

var FakeReporter = require('../support/fake_reporter');

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
          name: 'node-stdout',
          failed: 0,
          passed: 1
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
            text: 'foobar',
            type: 'error'
          }],
          name: 'node-stderr',
          failed: 1,
          passed: 0,
          error: {
            message: 'Stderr: \n foobar\n'
          }
        }
      }]);
      done();
    });
  });

  it('handles non existing processes', function(done) {
    var settings = {
      exe: 'nope-not-existing'
    };
    var launcher = new Launcher('nope-fail', settings, config);
    var runner = new ProcessTestRunner(launcher, reporter);

    runner.start(function() {
      expect(reporter.results).to.deep.equal([{
        result: {
          launcherId: launcher.id,
          logs: [{
            text: runner.lastErr.toString(),
            type: 'error'
          }],
          name: 'nope-fail',
          failed: 1,
          passed: 0,
          error: {
            message: 'Error: \n ' + runner.lastErr + '\n'
          }
        }
      }]);
      done();
    });
  });
});
