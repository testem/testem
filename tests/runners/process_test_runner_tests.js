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
          passed: true
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
          passed: false,
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
            text: 'Error: spawn nope-not-existing ENOENT',
            type: 'error'
          }],
          name: 'nope-fail',
          passed: false,
          error: {
            message: 'Error: \n Error: spawn nope-not-existing ENOENT\n'
          }
        }
      }]);
      done();
    });
  });
});
