var expect = require('chai').expect;
var sinon = require('sinon');
var fireworm = require('fireworm');

var Config = require('../lib/config');
var App = require('../lib/app');

var FakeReporter = require('./support/fake_reporter');

describe('App', function() {
  var app, config, sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('triggerRun', function() {
    beforeEach(function(done) {
      config = new Config('dev', {}, {
        reporter: new FakeReporter()
      });
      app = new App(config, function() {});
      sandbox.spy(app, 'triggerRun');
      app.start(done);
    });

    afterEach(function(done) {
      app.exit(null, done);
    });

    it('triggers a run on start', function() {
      expect(app.triggerRun.calledWith('Start')).to.be.true();
    });

    it('can only be executed once at the same time', function() {
      sandbox.stub(app, 'cleanUpProcessLaunchers');
      app.triggerRun('one');
      app.triggerRun('two');
      expect(app.cleanUpProcessLaunchers.callCount).to.eq(1);
    });
  });

  describe('pause running', function() {
    beforeEach(function(done) {
      config = new Config('dev', {}, {
        reporter: new FakeReporter()
      });
      app = new App(config, function() {});
      app.start(done);
    });

    afterEach(function(done) {
      app.exit(null, done);
    });

    it('starts off not paused', function() {
      expect(app.paused).to.be.false();
    });

    it('doesn\'t run tests when reset and paused', function(done) {
      app.paused = true;
      var runHook = sandbox.spy(app, 'runHook');
      app.runTests(null, done);
      expect(runHook.called).to.be.false();
    });

    it('runs tests when reset and not paused', function(done) {
      var runHook = sandbox.spy(app, 'runHook');
      app.runTests(null, done);
      expect(runHook.called).to.be.true();
    });
  });

  describe('file watching', function() {
    beforeEach(function() {
      sandbox.stub(Config.prototype, 'readConfigFile', function(file, cb) {
        cb();
      });
    });

    it('adds a watch', function(done) {
      var add = sandbox.spy(fireworm.prototype, 'add');
      var srcFiles = ['test.js'];
      config = new Config('dev', {}, {
        src_files: srcFiles,
        reporter: new FakeReporter()
      });
      app = new App(config, done);
      app.start(function() {
        expect(add.getCall(0).args[0]).to.eq(srcFiles);
        app.exit();
      });
    });

    it('triggers a test run on change', function(done) {
      var srcFiles = ['test.js'];
      config = new Config('dev', {}, {
        src_files: srcFiles,
        reporter: new FakeReporter()
      });
      app = new App(config, done);
      app.start(function() {
        sandbox.spy(app, 'triggerRun');
        app.fileWatcher.onFileChanged.call(app.fileWatcher, 'test.js');
        expect(app.triggerRun.calledWith('File changed: test.js')).to.be.true();
        app.exit();
      });
    });

    it('creates no watcher', function(done) {
      config = new Config('dev', {}, {
        src_files: ['test.js'],
        disable_watching: true,
        reporter: new FakeReporter()
      });
      app = new App(config, done);
      app.start(function() {
        expect(app.fileWatcher).to.eq(undefined);
        app.exit();
      });
    });
  });
});
