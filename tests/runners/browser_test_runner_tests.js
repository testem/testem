var BrowserTestRunner = require('../../lib/runners/browser_test_runner');
var TapReporter = require('../../lib/reporters/tap_reporter');
var expect = require('chai').expect;

var EventEmitter = require('events').EventEmitter;
var Config = require('../../lib/config');
var Launcher = require('../../lib/launcher.js');

describe('browser test runner', function() {
  describe('parallel runners', function() {
    var ffRunner, chromeRunner, reporter, launcher;
    var ff = {
      name: 'Firefox 21.0',
      socket: new EventEmitter()
    };
    var chrome = {
      name: 'Chrome 19.0',
      socket: new EventEmitter()
    };
    var Reporter = function() {
      this.logsByRunner = {};
      this.report = function(browser, msg) {
        this.logsByRunner[browser] = this.logsByRunner[browser] || [];
        this.logsByRunner[browser].push(msg);
      };
    };

    beforeEach(function() {
      reporter = new Reporter();
      var config = new Config('ci', {
        parallel: 2,
        reporter: reporter
      });
      launcher = new Launcher('ci', { protocol: 'browser' }, config);
      ffRunner = new BrowserTestRunner(launcher, reporter);
      chromeRunner = new BrowserTestRunner(launcher, reporter);
    });

    it('runners do not interfer with another', function() {
      ffRunner.tryAttach(ff.name, launcher.id, ff.socket);
      chromeRunner.tryAttach(chrome.name, launcher.id, chrome.socket);

      ff.socket.emit('test-result', {failed: 1, name: 'Test1'});
      chrome.socket.emit('test-result', {passed: 1, name: 'Test2'});

      ff.socket.emit('all-test-results');
      chrome.socket.emit('all-test-results');

      expect(reporter.logsByRunner).to.contain.keys(ff.name, chrome.name);

      expect(reporter.logsByRunner[ff.name]).to.have.length(1);
      expect(reporter.logsByRunner[chrome.name]).to.have.length(1);

      expect(reporter.logsByRunner[ff.name][0].name).to.equal('Test1');
      expect(reporter.logsByRunner[ff.name][0].passed).to.equal(false);

      expect(reporter.logsByRunner[chrome.name][0].name).to.equal('Test2');
      expect(reporter.logsByRunner[chrome.name][0].passed).to.equal(true);
    });
  });

  describe('onTestResult', function() {
    var runner, reporter;

    beforeEach(function() {
      reporter = new TapReporter();
      var config = new Config('ci', {
        parallel: 2,
        reporter: reporter
      });
      var launcher = new Launcher('ci', { protocol: 'browser' }, config);
      runner = new BrowserTestRunner(launcher, reporter);
    });

    it('does not count a test as passed if it has been skipped', function() {
      runner.onTestResult({
        failed: 0,
        skipped: true,
        name: 'skipped test',
        runDuration: 1,
      });
      expect(reporter.results.every(function(r) {
        return !r.result.passed;
      })).to.be.true();
    });

    it('does not count a test as passed if it has failures', function() {
      runner.onTestResult({
        failed: 1,
        skipped: false,
        name: 'failed test',
        runDuration: 20,
      });
      expect(reporter.results.every(function(r) {
        return !r.result.passed;
      })).to.be.true();
    });

    it('counts a test as skipped if it is skipped', function() {
      runner.onTestResult({
        failed: 0,
        skipped: true,
        name: 'skipped test',
        runDuration: 20,
      });
      expect(reporter.skipped).to.equal(1);
    });

    it('counts a test as passed when no failures occurred', function() {
      runner.onTestResult({
        name: 'no checks',
        items: [],
        failed: 0,
        passed: 0,
        skipped: false,
        total: 0,
        runDuration: 20
      });
      expect(reporter.pass).to.equal(1);
    });

    it('counts a test as passed if it has no failures and has not been skipped', function() {
      runner.onTestResult({
        passed: true,
        failed: 0,
        skipped: false,
        name: 'passed test',
        runDuration: 15,
      });
      expect(reporter.results.every(function(r) {
        return r.result.passed;
      })).to.be.true();
    });
  });

  describe('finish', function() {
    var runner;

    beforeEach(function() {
      var reporter = new TapReporter();
      var config = new Config('ci', { reporter: reporter });
      var launcher = new Launcher('ci', { protocol: 'browser' }, config);
      runner = new BrowserTestRunner(launcher, reporter);
    });

    it('ignores multiple finish calls', function(done) {
      runner.start(done);
      runner.finish();
      runner.finish();
    });
  });
});
