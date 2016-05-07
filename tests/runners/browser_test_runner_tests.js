'use strict';

var BrowserTestRunner = require('../../lib/runners/browser_test_runner');
var TapReporter = require('../../lib/reporters/tap_reporter');
var expect = require('chai').expect;
var sinon = require('sinon');
var Bluebird = require('bluebird');

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

    it('runners do not interfere with each other', function() {
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

  describe('receiving \'test-metadata\' event', function() {
    var eventName = 'test-metadata';
    var reporter, socket;

    beforeEach(function() {
      reporter = new TapReporter();

      var id = 1;
      var launcher = new Launcher('ci', { id: id, protocol: 'browser' }, new Config('ci', {
        parallel: 2,
        reporter: reporter
      }));

      socket = new EventEmitter();

      var runner = new BrowserTestRunner(launcher, reporter);
      runner.tryAttach('browser', id, socket);
    });

    it('should pass tag and metadata to reporter', function() {
      reporter.reportMetadata = function() { /* do nothing */ };
      sinon.spy(reporter, 'reportMetadata');

      socket.emit(eventName, 'tag', 'metadata');

      sinon.assert.calledWithExactly(reporter.reportMetadata, 'tag', 'metadata');
    });

    it('should not try to call an absent reporter metadata hook', function() {
      // testing that the following does not throw an error due to missing function
      socket.emit(eventName, 'tag', 'metadata');
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
        runDuration: 1
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
        runDuration: 20
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
        runDuration: 20
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
        runDuration: 15
      });
      expect(reporter.results.every(function(r) {
        return r.result.passed;
      })).to.be.true();
    });

    it('reports the first failed item as error', function() {
      var failedItem = { name: 'failed', failed: 1 };

      runner.onTestResult({
        failed: 1,
        skipped: false,
        name: 'failed test',
        runDuration: 20,
        items: [{ name: 'passed', passed: 1 }, failedItem]
      });

      expect(reporter.results[0].result.error).to.eq(failedItem);
    });
  });

  describe('start', function() {
    var reporter, launcher, runner, socket, sandbox;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      reporter = new TapReporter();
      var config = new Config('ci', { reporter: reporter, browser_start_timeout: 0.1 });
      launcher = new Launcher('ci', { protocol: 'browser' }, config);
      runner = new BrowserTestRunner(launcher, reporter);
      socket = new EventEmitter();
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('starts the launcher once', function() {
      sandbox.stub(launcher, 'start', function() {
        return Bluebird.resolve();
      });

      runner.start();
      runner.start();
      expect(launcher.start.calledOnce).to.be.true();
    });

    it('fails when the browser fails to start', function(done) {
      launcher.stdout = 'Not allowed to start.';

      runner.start(function() {
        expect(reporter.results[0].result).to.deep.eq({
          error: undefined,
          failed: 1,
          items: undefined,
          launcherId: launcher.id,
          logs: [],
          name:
            'Browser undefined failed to connect. testem.js not loaded?\n' +
            'Stdout: \nNot allowed to start.',
          passed: false,
          pending: undefined,
          runDuration: undefined,
          skipped: undefined
        });
        done();
      });
    });

    it('allows to cancel the timeout', function(done) {
      runner.start(function() {
        expect(reporter.results.length).to.eq(0);
        done();
      });

      setTimeout(function() {
        runner.tryAttach('browser', launcher.id, socket);
        setTimeout(function() {
          runner.finish();
        }, 100);
      }, 50);
    });

    it('does not start the launcher when already connected', function(done) {
      sandbox.spy(launcher, 'start');

      runner.socket = new EventEmitter();
      runner.socket.on('start-tests', function() {
        expect(launcher.start).not.to.have.been.called();
        done();
      });

      runner.start();
    });
  });

  describe('onDisconnect', function() {
    var reporter, launcher, runner, socket;

    beforeEach(function() {
      reporter = new TapReporter();
      var config = new Config('ci', { reporter: reporter, browser_disconnect_timeout: 0.1 });
      launcher = new Launcher('ci', { protocol: 'browser' }, config);
      runner = new BrowserTestRunner(launcher, reporter);
      socket = new EventEmitter();
    });

    it('fails when the browser fails to reconnect', function(done) {
      runner.start(function() {
        expect(reporter.results[0].result).to.deep.eq({
          error: undefined,
          failed: 1,
          items: undefined,
          launcherId: launcher.id,
          logs: [],
          name:
            'Browser undefined disconnected unexpectedly.\n' +
            'Stderr: \nBrowser crashed.',
          passed: false,
          pending: undefined,
          runDuration: undefined,
          skipped: undefined
        });
        done();
      });

      runner.tryAttach('browser', launcher.id, socket);
      launcher.stderr = 'Browser crashed.';

      runner.onDisconnect();
    });

    it('allows to cancel the timeout', function(done) {
      runner.start(function() {
        expect(reporter.results.length).to.eq(0);
        done();
      });

      runner.tryAttach('browser', launcher.id, socket);
      runner.onDisconnect();
      setTimeout(function() {
        runner.tryAttach('browser', launcher.id, socket);
        setTimeout(function() {
          runner.finish();
        }, 100);
      }, 50);
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
