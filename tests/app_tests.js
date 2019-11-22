'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const fireworm = require('fireworm');
const Bluebird = require('bluebird');

const Config = require('../lib/config');
const App = require('../lib/app');
const RunTimeout = require('../lib/utils/run-timeout');

const FakeReporter = require('./support/fake_reporter');

describe('App', function() {
  let app, config, sandbox;

  beforeEach(function() {
    sandbox = sinon.createSandbox();
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('triggerRun', function() {
    let finish;
    beforeEach(function(done) {
      config = new Config('dev', {}, {
        reporter: new FakeReporter()
      });
      app = new App(config, function() {
        if (finish) { finish(); }
        else { done(); }
      });
      sandbox.spy(app, 'triggerRun');
      sandbox.spy(app, 'stopRunners');
      sandbox.stub(app, 'singleRun').callsFake(function() {
        return Bluebird.resolve().delay(50);
      });
      app.once('testRun', done);
      app.start();
    });

    afterEach(function(done) {
      finish = done;
      app.exit();
    });

    it('triggers a run on start', function() {
      expect(app.triggerRun.calledWith('Start')).to.be.true();
    });

    it('can only be executed once at the same time', function() {
      app.currentRun = Bluebird.resolve();

      app.triggerRun('one');
      app.triggerRun('two');
      expect(app.stopRunners).to.have.been.calledOnce();
    });
  });

  describe('singleRun', function() {
    let runner;
    beforeEach(function() {
      config = new Config('dev', {}, {
        reporter: new FakeReporter()
      });
      app = new App(config);
      runner = {
        start: function() {
          return Bluebird.resolve().delay(100).then(function() {
            if (this.killed) {
              throw new Error('Killed');
            }

            return;
          }.bind(this));
        },
        exit: function() {
          this.killed = true;

          return Bluebird.resolve();
        }
      };
      app.runners = [runner];

      sandbox.spy(runner, 'start');
      sandbox.spy(runner, 'exit');
    });

    it('times out slow runners', function() {
      return Bluebird.using(RunTimeout.with(0.005), function(timeout) {
        timeout.on('timeout', function() {
          app.killRunners();
        });

        return app.singleRun(timeout);
      }).then(function() {
        expect('Should never be called').to.be.true();
      }, function(err) {
        expect(err.message).to.eq('Killed');
        expect(err.hideFromReporter).not.to.exist();
        expect(runner.start).to.have.been.called();
        expect(runner.exit).to.have.been.called();
      });
    });

    it('doesn\'t start additional runners when timed out', function() {
      return Bluebird.using(RunTimeout.with(0), function(timeout) {
        timeout.on('timeout', function() {
          app.killRunners();
        });
        timeout.setTimedOut();

        return app.singleRun(timeout);
      }).then(function() {
        expect('Should never be called').to.be.true();
      }, function(err) {
        expect(err.message).to.eq('Run timed out.');
        expect(err.hideFromReporter).not.to.exist();
        expect(runner.start).to.not.have.been.called();
        expect(runner.exit).to.have.been.called();
      });
    });

    it('resolves when restarting', function() {
      app.restarting = true;

      return Bluebird.using(RunTimeout.with(app.config.get('timeout')), function(timeout) {
        timeout.on('timeout', function() {
          app.killRunners();
        });
        return app.singleRun(timeout);
      }).then(function() {
        expect(runner.start).to.not.have.been.called();
        expect(runner.exit).to.not.have.been.called();
      });
    });

    it('rejects when exiting', function() {
      app.exited = true;

      return Bluebird.using(RunTimeout.with(app.config.get('timeout')), function(timeout) {
        timeout.timedOut = true;
        timeout.on('timeout', function() {
          app.killRunners();
        });
        return app.singleRun(timeout);
      }).then(function() {
        expect('Should never be called').to.be.true();
      }, function(err) {
        expect(err.message).to.eq('Run canceled.');
        expect(err.hideFromReporter).to.be.true();
        expect(runner.start).to.not.have.been.called();
        expect(runner.exit).to.not.have.been.called();
      });
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

    it('doesn\'t run tests when reset and paused', function() {
      app.paused = true;
      let runHook = sandbox.spy(app, 'runHook');

      return app.runTests().then(function() {
        expect(runHook.called).to.be.false();
      });
    });

    it('runs tests when reset and not paused', function() {
      let runHook = sandbox.spy(app, 'runHook');

      return app.runTests().then(function() {
        expect(runHook.called).to.be.true();
      });
    });
  });

  describe('file watching', function() {
    beforeEach(function() {
      sandbox.stub(Config.prototype, 'readConfigFile').callsFake(function(file, cb) {
        cb();
      });
    });

    it('adds a watch', function(done) {
      let add = sandbox.spy(fireworm.prototype, 'add');
      let srcFiles = ['test.js'];
      config = new Config('dev', {}, {
        src_files: srcFiles,
        reporter: new FakeReporter()
      });
      app = new App(config, function() {
        done();
      });
      app.start(function() {
        expect(add.getCall(0).args[0]).to.eq(srcFiles);
        app.exit();
      });
    });

    it('triggers a test run on change', function(done) {
      let srcFiles = ['test.js'];
      config = new Config('dev', {}, {
        src_files: srcFiles,
        reporter: new FakeReporter()
      });
      app = new App(config, function() {
        done();
      });
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
      app = new App(config, function() {
        done();
      });
      app.start(function() {
        expect(app.fileWatcher).to.eq(undefined);
        app.exit();
      });
    });
  });

  describe('start', function() {
    let finish;
    let onExitCb;
    let onExitFinished;

    beforeEach(function() {
      onExitFinished = false;
      onExitCb = sinon.stub().callsFake(function(config, data, callback) {
        setTimeout(function() {
          callback(null);
          onExitFinished = true;
        }, 10);
      });
      config = new Config('dev', {}, {
        reporter: new FakeReporter(),
        on_exit: onExitCb
      });
      app = new App(config, function() {
        expect(onExitCb.called).to.be.true();
        expect(onExitFinished).to.be.true();
        finish();
      });
      app.once('testRun', app.exit);
    });

    it('calls on_exit hook on success', function(done) {
      finish = done;
      sandbox.stub(app, 'waitForTests').usingPromise(Bluebird.Promise).resolves();
      app.start();
    });

    it('calls on_exit hook on failure and waits for it to finish', function(done) {
      finish = done;
      sandbox.stub(app, 'waitForTests').usingPromise(Bluebird.Promise).rejects();
      app.start();
    });
  });

  describe('onBrowserRelogin', function() {
    let tryAttachCalled;

    beforeEach(function() {
      config = new Config('dev', {}, {
        reporter: new FakeReporter()
      });
      app = new App(config);
      tryAttachCalled = false;
      app.runners = [
        {
          launcherId: 1,
          socket: {},
          tryAttach: () => {
            tryAttachCalled = true;
          }
        },
        {
          launcherId: 2,
          socket: null,
          tryAttach: () => {
            tryAttachCalled = true;
          }
        },
        {
          launcherId: 3,
          tryAttach: () => {
            tryAttachCalled = true;
          }
        }
      ];
    });

    it('calls tryAttach for an existing browser with existing socket', function() {
      app.onBrowserRelogin('fakeBrowser', 1, {});
      expect(tryAttachCalled).to.be.true();
    });

    it('calls tryAttach for an existing browser with null socket', function() {
      app.onBrowserRelogin('fakeBrowser', 2, {});
      expect(tryAttachCalled).to.be.true();
    });
  });
});
