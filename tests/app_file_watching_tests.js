const Path = require('path');

const expect = require('chai').expect;
const sinon = require('sinon');

const Config = require('../lib/config');
const App = require('../lib/app');
const FileWatcher = require('../lib/file_watcher');

const FakeReporter = require('./support/fake_reporter');

describe('App file watching', function() {
  let app;
  let config;
  let sandbox;

  beforeEach(function() {
    sandbox = sinon.createSandbox();
    sandbox.stub(Config.prototype, 'readConfigFile').callsFake(function(file, cb) {
      cb();
    });
  });

  afterEach(function() {
    sandbox.restore();
  });

  it('creates a FileWatcher when watching is enabled', function(done) {
    config = new Config('dev', {}, {
      src_files: ['test.js'],
      reporter: new FakeReporter(),
    });
    app = new App(config, function() {
      done();
    });
    app.start(function() {
      expect(app.fileWatcher).to.be.instanceOf(FileWatcher);
      app.exit();
    });
  });

  it('triggers a test run on change', function(done) {
    const srcFiles = ['test.js'];
    config = new Config('dev', {}, {
      src_files: srcFiles,
      reporter: new FakeReporter(),
    });
    app = new App(config, function() {
      done();
    });
    app.start(function() {
      sandbox.spy(app, 'triggerRun');
      app.fileWatcher.onFileChanged.call(app.fileWatcher, 'test.js');
      setImmediate(function() {
        expect(app.triggerRun.calledWith('File changed: test.js')).to.be.true();
        app.exit();
      });
    });
  });

  it('creates no watcher when disable_watching is set', function(done) {
    config = new Config('dev', {}, {
      src_files: ['test.js'],
      disable_watching: true,
      reporter: new FakeReporter(),
    });
    app = new App(config, function() {
      done();
    });
    app.start(function() {
      expect(app.fileWatcher).to.eq(undefined);
      app.exit();
    });
  });

  it('calls fileWatcher.add from onFileRequested when serve_files is not set', function(done) {
    config = new Config('dev', {}, {
      src_files: ['*.js'],
      reporter: new FakeReporter(),
    });
    app = new App(config, function() {
      done();
    });
    app.start(function() {
      const addSpy = sandbox.spy(app.fileWatcher, 'add');
      app.onFileRequested(Path.join('some', 'path.js'));
      expect(addSpy).to.have.been.calledOnce();
      expect(addSpy).to.have.been.calledWith(Path.join('some', 'path.js'));
      app.exit();
    });
  });

  it('does not call fileWatcher.add from onFileRequested when serve_files is set', function(done) {
    config = new Config('dev', {}, {
      src_files: ['*.js'],
      serve_files: ['**/*.html'],
      reporter: new FakeReporter(),
    });
    app = new App(config, function() {
      done();
    });
    app.start(function() {
      const addSpy = sandbox.spy(app.fileWatcher, 'add');
      app.onFileRequested(Path.join('public', 'app.js'));
      expect(addSpy).not.to.have.been.called();
      app.exit();
    });
  });

  it('runs configure and triggers Config changed when the config file path changes', function(done) {
    const configPath = Path.join(__dirname, 'testem.yml');
    config = new Config('dev', {}, {
      file: configPath,
      src_files: ['*.js'],
      reporter: new FakeReporter(),
    });
    app = new App(config, function() {
      done();
    });
    app.configure = sandbox.stub().callsFake(function(cb) {
      if (cb) {
        cb();
      }
    });
    app.start(function() {
      sandbox.spy(app, 'triggerRun');
      app.fileWatcher.emit('fileChanged', Path.resolve(configPath));
      setImmediate(function() {
        expect(app.configure).to.have.been.called();
        expect(app.triggerRun.calledWith('Config changed')).to.be.true();
        app.exit();
      });
    });
  });

  it('triggers Config changed when cwd mode and filepath is process.cwd()', function(done) {
    config = new Config('dev', {}, {
      reporter: new FakeReporter(),
    });
    sandbox.stub(config, 'isCwdMode').returns(true);
    app = new App(config, function() {
      done();
    });
    app.configure = sandbox.stub().callsFake(function(cb) {
      if (cb) {
        cb();
      }
    });
    app.start(function() {
      sandbox.spy(app, 'triggerRun');
      app.fileWatcher.emit('fileChanged', process.cwd());
      setImmediate(function() {
        expect(app.configure).to.have.been.called();
        expect(app.triggerRun.calledWith('Config changed')).to.be.true();
        app.exit();
      });
    });
  });

  it('does not trigger a run when paused', function(done) {
    config = new Config('dev', {}, {
      src_files: ['test.js'],
      reporter: new FakeReporter(),
    });
    app = new App(config, function() {
      done();
    });
    app.start(function() {
      app.paused = true;
      sandbox.spy(app, 'triggerRun');
      app.fileWatcher.emit('fileChanged', Path.join(process.cwd(), 'test.js'));
      setImmediate(function() {
        expect(app.triggerRun).not.to.have.been.called();
        app.exit();
      });
    });
  });

  it('does not trigger a run when disableFileWatch is set', function(done) {
    config = new Config('dev', {}, {
      src_files: ['test.js'],
      reporter: new FakeReporter(),
    });
    app = new App(config, function() {
      done();
    });
    app.start(function() {
      app.disableFileWatch = true;
      sandbox.spy(app, 'triggerRun');
      app.fileWatcher.emit('fileChanged', Path.join(process.cwd(), 'test.js'));
      setImmediate(function() {
        expect(app.triggerRun).not.to.have.been.called();
        app.exit();
      });
    });
  });

  it('runs on_change hook then triggers a run for a normal file change', function(done) {
    config = new Config('dev', {}, {
      src_files: ['*.js'],
      reporter: new FakeReporter(),
    });
    app = new App(config, function() {
      done();
    });
    app.start(function() {
      const originalRunHook = app.runHook.bind(app);
      sandbox.stub(app, 'runHook').callsFake(function(hook, data) {
        if (hook === 'on_change') {
          return Promise.resolve();
        }
        return originalRunHook(hook, data);
      });
      sandbox.spy(app, 'triggerRun');
      const changedPath = Path.join(process.cwd(), 'src', 'foo.js');
      app.fileWatcher.emit('fileChanged', changedPath);
      setImmediate(function() {
        expect(app.runHook).to.have.been.calledWith('on_change', {
          file: changedPath,
        });
        expect(app.triggerRun.calledWith('File changed: ' + changedPath)).to.be.true();
        app.exit();
      });
    });
  });

  it('sets an EMFILE error on the dev view when the file watcher emits EMFILE', function(done) {
    config = new Config('dev', {}, {
      src_files: ['*.js'],
      reporter: new FakeReporter(),
    });
    app = new App(config, function() {
      done();
    });
    app.start(function() {
      const setErrorPopupMessage = sandbox.spy();
      app.view = { setErrorPopupMessage };
      app.fileWatcher.emit('EMFILE');
      expect(setErrorPopupMessage).to.have.been.calledOnce();
      expect(setErrorPopupMessage.firstCall.args[0].toString()).to.contain('EMFILE');
      app.exit();
    });
  });
});
