var BrowserRunner = require('../lib/browser_runner');
var EventEmitter = require('events').EventEmitter;
var expect = require('chai').expect;
var bd = require('bodydouble');
var stub = bd.stub;
var Config = require('../lib/config');
var Launcher = require('../lib/launcher.js');
var BrowserTestRunner = require('../lib/ci/browser_test_runner');

describe('BrowserRunner', function() {
  var socket, runner;
  beforeEach(function() {
    socket = new EventEmitter();
    runner = new BrowserRunner({
      name: 'Chrome 19.0',
      socket: socket
    });
  });
  afterEach(function() {
    bd.restoreStubs();
  });
  it('can create', function() {
    expect(runner.get('socket')).to.equal(socket);
  });
  describe('parallel runners', function() {
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
    var reporter = new Reporter();
    var config = new Config('ci', {
      parallel: 2,
      reporter: reporter
    });
    var launcher = new Launcher('ci', { protocol: 'browser' }, config);
    var runner = new BrowserTestRunner(launcher, reporter);

    it('runners do not interfer with another', function() {
      runner.tryAttach(ff.name, launcher.id, ff.socket);
      runner.tryAttach(chrome.name, launcher.id, chrome.socket);

      ff.socket.emit('test-result', {failed: 1, name: 'Test1'});
      chrome.socket.emit('test-result', {passed: true, name: 'Test2'});

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
  describe('reset Test Results', function() {
    it('resets topLevelError', function() {
      var results = runner.get('results');
      results.set('topLevelError', 'blah');
      results.reset();
      expect(results.get('topLevelError')).to.equal(null);
    });
    it('resets results', function() {
      var results = runner.get('results');
      results.addResult({
        failed: false,
        passed: true
      });
      results.reset();
      expect(results.get('total')).to.equal(0);
      expect(results.get('passed')).to.equal(0);
      expect(results.get('pending')).to.equal(0);
    });
  });
  it('emits start-tests and resets when startTests', function() {
    var results = runner.get('results');
    stub(results, 'reset');
    stub(socket, 'emit');
    runner.startTests();
    expect(results.reset.callCount).to.equal(1);
    expect(socket.emit.lastCall.args).to.deep.equal(['start-tests']);
  });
  it('sets topLevelError when error emitted', function() {
    socket.emit('top-level-error', 'TypeError: bad news', 'http://test.com/bad.js', 45);
    expect(runner.get('messages').at(0).get('text')).to.equal('TypeError: bad news at http://test.com/bad.js, line 45\n');
  });
  it('emits tests-start on server on tests-start', function() {
    stub(runner, 'trigger');
    socket.emit('tests-start');
    expect(runner.trigger.lastCall.args).to.deep.equal(['tests-start']);
  });
  it('updates results on test-result', function() {
    var results = runner.get('results');
    socket.emit('test-result', {failed: 1});
    expect(results.get('passed')).to.equal(0);
    expect(results.get('failed')).to.equal(1);
    socket.emit('test-result', {failed: 0});
    expect(results.get('passed')).to.equal(1);
    socket.emit('test-result', {pending: 1});
    expect(results.get('pending')).to.equal(1);
    expect(results.get('tests').length).to.equal(3);
  });
  it('sets "all" on all-tests-results', function() {
    socket.emit('all-test-results');
    expect(runner.get('results').get('all')).to.be.ok;
  });
});
