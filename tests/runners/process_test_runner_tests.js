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
    var launcher = new Launcher('launcher', settings, config);
    var runner = new ProcessTestRunner(launcher, reporter);

    runner.start(function() {
      var results = reporter.results;
      expect(results.length).to.equal(1);

      expect(results[0].result.passed).to.be.true();
      expect(results[0].result.logs.length).to.equal(1);
      var message = results[0].result.logs[0];
      expect(message.type).to.equal('log');
      expect(message.text).to.equal('foobar');
      done();
    });
  });

  it('reads stderr into messages', function(done) {
    var settings = {
      exe: 'node',
      args: [path.join(__dirname, '../fixtures/processes/stderr.js')]
    };
    var launcher = new Launcher('launcher', settings, config);
    var runner = new ProcessTestRunner(launcher, reporter);

    runner.start(function() {
      var results = reporter.results;
      expect(results.length).to.equal(1);

      expect(results[0].result.passed).to.be.true();
      expect(results[0].result.logs.length).to.equal(1);
      var message = results[0].result.logs[0];
      expect(message.type).to.equal('error');
      expect(message.text).to.equal('foobar');
      done();
    });
  });
});
