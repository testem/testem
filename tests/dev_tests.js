var expect = require('chai').expect;
var sinon = require('sinon');
var fireworm = require('fireworm');

var Config = require('../lib/config');
var App = require('../lib/app');

var FakeReporter = require('./support/fake_reporter');

var isWin = /^win/.test(process.platform);

describe('Dev', !isWin ? function() {
  var app, config, sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('pause running', function(done) {
    beforeEach(function() {
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
} : function() {
  xit('TODO: Fix and re-enable for windows');
});
