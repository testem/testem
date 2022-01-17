'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const Bluebird = require('bluebird');
const fs = require('fs');
const tmp = require('tmp');
const path = require('path');

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
      let srcFiles = ['test.js'];
      config = new Config('dev', {}, {
        src_files: srcFiles,
        reporter: new FakeReporter()
      });
      app = new App(config, function() {
        expect(app.fileWatcher.fileWatcher.globs).to.deep.eq(srcFiles);
        done();
      });
      app.start(function() {
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
        expect(app.triggerRun.calledWith('File changed: test.js')).to.be.true();
        done();
      });
      app.start(function() {
        sandbox.spy(app, 'triggerRun');
        app.fileWatcher.onFileChanged.call(app.fileWatcher, 'test.js');
        app.exit();
      });
    });

    it('triggers a test run when a file is changed', function(done) {
      let fileName = 'test-watched-file.js';

      let tmpDir = tmp.dirSync().name;
      fs.writeFileSync(path.join(tmpDir, fileName), 'test-content', 'utf-8');

      let srcFiles = [fileName];
      config = new Config('dev', {}, {
        cwd: tmpDir,
        src_files: srcFiles,
        reporter: new FakeReporter()
      });
      app = new App(config, function() {
        expect(app.triggerRun.calledWith(`File changed: ${fileName}`)).to.be.true();
        expect(app.triggerRun.calledWith('File changed: other-file-name.js')).to.be.false();
        done();
      });
      app.start(function() {
        sandbox.spy(app, 'triggerRun');

        fs.writeFileSync(path.join(tmpDir, fileName), 'test-content-new', 'utf-8');
        fs.writeFileSync(path.join(tmpDir, 'other-file-name.js'), 'new-file', 'utf-8');

        setTimeout(() => app.exit(), 1000);
      });
    });

    it('skips ignored files', function(done) {
      let tmpDir = tmp.dirSync().name;
      fs.writeFileSync(path.join(tmpDir, 'file1.js'), 'test-content', 'utf-8');
      fs.writeFileSync(path.join(tmpDir, 'ignored-file.js'), 'test-content', 'utf-8');

      let srcFiles = ['*.js'];
      config = new Config('dev', {}, {
        cwd: tmpDir,
        src_files: srcFiles,
        src_files_ignore: 'ignored-file.js',
        reporter: new FakeReporter()
      });
      app = new App(config, function() {
        expect(app.triggerRun.calledWith('File changed: file1.js')).to.be.true();
        expect(app.triggerRun.calledWith('File changed: file2.js')).to.be.true();
        expect(app.triggerRun.calledWith('File changed: ignored-file.js')).to.be.false();
        done();
      });
      app.start(function() {
        sandbox.spy(app, 'triggerRun');

        fs.writeFileSync(path.join(tmpDir, 'file1.js'), 'test-content-new', 'utf-8');
        fs.writeFileSync(path.join(tmpDir, 'file2.js'), 'test-content-new', 'utf-8');
        fs.writeFileSync(path.join(tmpDir, 'ignored-file.js'), 'test-content-new', 'utf-8');

        setTimeout(() => app.exit(), 1000);
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
          },
          clearTimeouts: () => { }
        },
        {
          launcherId: 2,
          socket: null,
          tryAttach: () => {
            tryAttachCalled = true;
          },
          clearTimeouts: () => { }
        },
        {
          launcherId: 3,
          tryAttach: () => {
            tryAttachCalled = true;
          },
          clearTimeouts: () => { }
        }
      ];
    });

    it('does not call tryAttach for an existing browser with existing socket', function() {
      app.onBrowserRelogin('fakeBrowser', 1, {});
      expect(tryAttachCalled).to.be.false();
    });

    it('calls tryAttach for an existing browser with null socket', function() {
      app.onBrowserRelogin('fakeBrowser', 2, {});
      expect(tryAttachCalled).to.be.true();
    });
  });
});
