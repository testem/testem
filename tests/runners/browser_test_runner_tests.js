'use strict';

const BrowserTestRunner = require('../../lib/runners/browser_test_runner');
const FakeReporter = require('../support/fake_reporter');
const FakeSocket = require('../support/fake_socket');
const expect = require('chai').expect;
const sinon = require('sinon');
const Bluebird = require('bluebird');
const path = require('path');

const Config = require('../../lib/config');
const Launcher = require('../../lib/launcher.js');

describe('browser test runner', function() {
  describe('parallel runners', function() {
    let ffRunner, chromeRunner, reporter, launcher;
    let ff = {
      name: 'Firefox 21.0',
      socket: new FakeSocket()
    };
    let chrome = {
      name: 'Chrome 19.0',
      socket: new FakeSocket()
    };
    let Reporter = function() {
      this.logsByRunner = {};
      this.report = function(browser, msg) {
        this.logsByRunner[browser] = this.logsByRunner[browser] || [];
        this.logsByRunner[browser].push(msg);
      };
      this.onStart = function() {};
      this.onEnd = function() {};
    };

    beforeEach(function() {
      reporter = new Reporter();
      let config = new Config('ci', {
        parallel: 2,
        reporter: reporter
      });
      launcher = new Launcher('ci', { protocol: 'browser' }, config);
      ffRunner = new BrowserTestRunner(launcher, reporter, null, null, config);
      chromeRunner = new BrowserTestRunner(launcher, reporter, null, null, config);
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
    let eventName = 'test-metadata';
    let reporter, socket;

    beforeEach(function() {
      reporter = new FakeReporter();

      let id = 1;
      let config = new Config('ci', {
        parallel: 2,
        reporter: reporter
      });
      let launcher = new Launcher('ci', { id: id, protocol: 'browser' }, config);

      socket = new FakeSocket();

      let runner = new BrowserTestRunner(launcher, reporter, null, null, config);
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

  describe('onTestsStart', function() {
    let runner, reporter;

    beforeEach(function() {
      reporter = new FakeReporter();
      let config = new Config('ci', {
        parallel: 2,
        reporter: reporter
      });
      let launcher = new Launcher('ci', { protocol: 'browser' }, config);
      runner = new BrowserTestRunner(launcher, reporter);
    });

    it('saves the currentTextContext if passed as parameter', function() {
      runner.onTestsStart({
        name: 'testname',
      });
      expect(runner.currentTestContext.name).to.equal('testname');
      expect(runner.currentTestContext.state).to.equal('executing');
    });

    it('has empty currentTextContext if no testcontext passed', function() {
      runner.onTestsStart();
      expect(runner.currentTestContext).to.deep.eq({});
    });
  });

  describe('onTestResult', function() {
    let runner, reporter;

    beforeEach(function() {
      reporter = new FakeReporter();
      let config = new Config('ci', {
        parallel: 2,
        reporter: reporter
      });
      let launcher = new Launcher('ci', { protocol: 'browser' }, config);
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
      let failedItem = { name: 'failed', failed: 1 };

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

  describe('onGlobalError with bail_on_uncaught_error===true', function() {
    let runner, reporter;

    beforeEach(function() {
      reporter = new FakeReporter();
      let config = new Config('ci', {
        parallel: 2,
        reporter: reporter,
        bail_on_uncaught_error: true
      });
      let launcher = new Launcher('ci', { protocol: 'browser' }, config);
      runner = new BrowserTestRunner(launcher, reporter);
    });

    it('causes immediate finish', function() {
      runner.onGlobalError('something went wrong', 'http://example.com', 123);
      expect(runner.finished).to.equal(true);
    });
  });

  describe('onGlobalError with bail_on_uncaught_error===false', function() {
    let runner, reporter;

    beforeEach(function() {
      reporter = new FakeReporter();
      let config = new Config('ci', {
        parallel: 2,
        reporter: reporter,
        bail_on_uncaught_error: false
      });
      let launcher = new Launcher('ci', { protocol: 'browser' }, config);
      runner = new BrowserTestRunner(launcher, reporter);
    });

    it('is still running', function() {
      runner.onGlobalError('something went wrong', 'http://example.com', 123);
      expect(runner.finished).to.not.equal(true);
    });
  });


  describe('start', function() {
    let reporter, launcher, runner, socket, sandbox;

    beforeEach(function() {
      sandbox = sinon.createSandbox();
      reporter = new FakeReporter();
      let config = new Config('ci', { reporter: reporter, browser_start_timeout: 2 });
      launcher = new Launcher('ci', { protocol: 'browser' }, config);
      runner = new BrowserTestRunner(launcher, reporter, null, null, config);
      socket = new FakeSocket();
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('starts the launcher once', function() {
      sandbox.stub(launcher, 'start').callsFake(function() {
        return Bluebird.resolve({
          on: function() {}
        });
      });

      runner.start();
      runner.start();
      expect(launcher.start.calledOnce).to.be.true();
    });


    it('fails without command or exe', function(done) {
      runner.start(function() {
        expect(reporter.results[0].result).to.deep.eq({
          error: {
            message: 'Error: No command or exe/args specified for launcher ci\n'
          },
          failed: 1,
          launcherId: launcher.id,
          logs: [{
            text: 'Error: No command or exe/args specified for launcher ci',
            type: 'error'
          }],
          name: 'error',
          passed: 0,
          testContext: {}
        });
        done();
      });
    });

    it('fails when the browser fails to start', function(done) {
      launcher.settings.exe = 'not-found';
      runner.start(function() {
        expect(reporter.results[0].result).to.shallowDeepEqual({
          error: {},
          failed: 1,
          items: undefined,
          launcherId: launcher.id,
          logs: [{
            type: 'error'
          }],
          passed: 0,
          testContext: {}
        });
        expect(reporter.results[0].result.error.message).to.match(/ENOENT/);
        expect(reporter.results[0].result.logs[0].text).to.match(/ENOENT/);
        done();
      });
    });

    it('fails when the browser fails to connect', function(done) {
      launcher.settings.exe = 'node';
      launcher.settings.args = [path.join(__dirname, '../fixtures/processes/just-running.js')];
      runner.start(function() {
        expect(reporter.results[0].result).to.deep.eq({
          error: {
            message: 'Error: Browser failed to connect within 2s. testem.js not loaded?\n'
          },
          failed: 1,
          launcherId: launcher.id,
          logs: [{
            text: 'Error: Browser failed to connect within 2s. testem.js not loaded?',
            type: 'error'
          }],
          name: 'error',
          passed: 0,
          testContext: {}
        });
        done();
      });
    });

    it('fails when the browser exits unexpectedly', function(done) {
      launcher.settings.exe = 'node';
      launcher.settings.args = ['-e', 'console.log(\'test\')'];
      runner.start(function() {
        expect(reporter.results[0].result).to.deep.eq({
          error: {
            message: 'Error: Browser exited unexpectedly\nStdout: \n test\n\n'
          },
          failed: 1,
          launcherId: launcher.id,
          logs: [{
            text: 'Error: Browser exited unexpectedly',
            type: 'error'
          }, {
            text: 'test\n',
            type: 'log'
          }],
          name: 'error',
          passed: 0,
          testContext: {}
        });
        done();
      });
    });

    it('allows to cancel the timeout', function(done) {
      launcher.settings.exe = 'node';
      launcher.settings.args = [path.join(__dirname, '../fixtures/processes/just-running.js')];
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

      runner.socket = new FakeSocket();
      runner.socket.on('start-tests', function() {
        expect(launcher.start).not.to.have.been.called();
        done();
      });

      runner.start();
    });
  });

  describe('tryAttach', function() {
    let reporter, launcher, runner, socket;

    beforeEach(function() {
      reporter = new FakeReporter();
      let config = new Config('ci', {
        reporter: reporter,
        browser_disconnect_timeout: 0.1,
        browser_reconnect_limit: 0
      });
      launcher = new Launcher('ci', { protocol: 'browser' }, config);
      runner = new BrowserTestRunner(launcher, reporter, null, null, config);
      socket = new FakeSocket();
    });

    it('exceeding browser reconnect limit should not allow browser reconnect', function(done) {
      let didReattach = true;
      launcher.settings.exe = 'node';
      launcher.settings.args = [path.join(__dirname, '../fixtures/processes/just-running.js')];
      runner.start(function() {
        expect(didReattach).to.eq(false);
        done();
      });

      runner.tryAttach('browser', launcher.id, socket);
      runner.onDisconnect();
      didReattach = runner.tryAttach('browser', launcher.id, socket);
    });
  });

  describe('onDisconnect', function() {
    let reporter, launcher, runner, socket;

    beforeEach(function() {
      reporter = new FakeReporter();
      let config = new Config('ci', {
        reporter: reporter,
        browser_disconnect_timeout: 0.1
      });
      launcher = new Launcher('ci', { protocol: 'browser' }, config);
      runner = new BrowserTestRunner(launcher, reporter, null, null, config);
      socket = new FakeSocket();
    });

    it('fails when the browser fails to reconnect', function(done) {
      launcher.settings.exe = 'node';
      launcher.settings.args = [path.join(__dirname, '../fixtures/processes/just-running.js')];
      runner.start(function() {
        expect(reporter.results[0].result).to.deep.eq({
          error: {
            message: 'Error: Browser timeout exceeded: 0.1s\n'
          },
          failed: 1,
          launcherId: launcher.id,
          logs: [{
            text: 'Error: Browser timeout exceeded: 0.1s',
            type: 'error'
          }],
          name: 'error',
          passed: 0,
          testContext: {}
        });
        done();
      });

      runner.tryAttach('browser', launcher.id, socket);

      runner.onDisconnect();
    });

    it('allows to cancel the timeout', function(done) {
      launcher.settings.exe = 'node';
      launcher.settings.args = [path.join(__dirname, 'fixtures/processes/just-running.js')];
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

  describe('additionalBrowserSocketEvents', function() {
    it('binds additional browser socket events', function() {
      let eventName = 'testEvent';
      let eventFn = function() {
        return 'testing additionalBrowserSocketEvents.';
      };
      let custom_browser_socket_events = {};
      custom_browser_socket_events[eventName] = eventFn;

      let socket = new FakeSocket();
      let reporter = new FakeReporter();
      let config = new Config('ci', { custom_browser_socket_events, reporter: reporter });
      let launcher = new Launcher('ci', { protocol: 'browser' }, config);
      let runner = new BrowserTestRunner(launcher, reporter, null, null, config);

      runner.tryAttach('browser', launcher.id, socket);

      expect(eventFn()).to.deep.equal(socket.listeners(eventName)[0]());
    });
  });

  describe('finish', function() {
    let runner;

    beforeEach(function() {
      let reporter = new FakeReporter();
      let config = new Config('ci', { reporter: reporter });
      let launcher = new Launcher('ci', { protocol: 'browser' }, config);
      runner = new BrowserTestRunner(launcher, reporter, 1, true, config);
    });

    it('ignores multiple finish calls', function(done) {
      runner.start(done);
      runner.finish();
      runner.finish();
    });
  });
});
