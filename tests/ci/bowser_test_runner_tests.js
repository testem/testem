var BrowserTestRunner = require('../../lib/ci/browser_test_runner');
var TestReporter = require('../../lib/ci/test_reporters/tap_reporter');
var assert = require('chai').assert;

describe('browser test runner', function() {
  var runner;
  var reporter;

  beforeEach(function() {
    reporter = new TestReporter();
    runner = new BrowserTestRunner(null, reporter);
  });

  afterEach(function() {
    runner = null;
    reporter = null;
  });

  describe('onTestResult', function() {
    it('does not count a test as passed if it has been skipped', function() {
      runner.onTestResult({
        failed: 0,
        skipped: true,
        name: 'skipped test',
        runDuration: 1,
      });
      assert(reporter.results.every(function(r) {
        return !r.result.passed;
      }), 'skipped tests have not passed');
    });

    it('does not count a test as passed if it has failures', function() {
      runner.onTestResult({
        failed: 1,
        skipped: false,
        name: 'failed test',
        runDuration: 20,
      });
      assert(reporter.results.every(function(r) {
        return !r.result.passed;
      }), 'failed tests have not passed');
    });

    it('counts a test as passed if it has no failures and has not been skipped', function() {
      runner.onTestResult({
        failed: 0,
        skipped: false,
        name: 'passed test',
        runDuration: 15,
      });
      assert(reporter.results.every(function(r) {
        return r.result.passed;
      }), 'tests that have not failed or been skipped have passed');
    });
  });
});
