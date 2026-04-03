const path = require('path');

const expect = require('chai').expect;
const sinon = require('sinon');

// `lib/file_watcher.js` requires a watch-engine package; tests substitute a stub for that
// module so FileWatcher behavior is asserted without touching the filesystem.
const watchEngineModulePath = require.resolve('fireworm');
require(watchEngineModulePath);
const savedWatchEngineExports = require.cache[watchEngineModulePath].exports;

const fileWatcherModulePath = require.resolve('../lib/file_watcher.js');

describe('FileWatcher', function() {
  let sandbox;
  let mockWatcher;
  let stubWatchEngineFactory;
  let FileWatcher;

  function makeConfig(overrides) {
    const state = {
      file: undefined,
      watch_files: undefined,
      src_files: undefined,
      src_files_ignore: undefined,
      cwdMode: false,
      ...overrides,
    };
    return {
      get(key) {
        return state[key];
      },
      isCwdMode() {
        return !!state.cwdMode;
      },
    };
  }

  function getHandler(event) {
    const calls = mockWatcher.on.getCalls();
    for (let i = 0; i < calls.length; i++) {
      if (calls[i].args[0] === event) {
        return calls[i].args[1];
      }
    }
    throw new Error('No ' + event + ' handler registered');
  }

  beforeEach(function() {
    sandbox = sinon.createSandbox();
    mockWatcher = {
      on: sandbox.stub(),
      clear: sandbox.stub(),
      add: sandbox.stub(),
      ignore: sandbox.stub(),
    };
    stubWatchEngineFactory = sandbox.stub().callsFake(function() {
      return mockWatcher;
    });
    require.cache[watchEngineModulePath].exports = stubWatchEngineFactory;
    delete require.cache[fileWatcherModulePath];
    FileWatcher = require('../lib/file_watcher.js');
  });

  afterEach(function() {
    require.cache[watchEngineModulePath].exports = savedWatchEngineExports;
    delete require.cache[fileWatcherModulePath];
    sandbox.restore();
  });

  describe('constructor', function() {
    it('creates the underlying watcher at ./ with ignoreInitial and empty skipDirEntryPatterns', function() {
      new FileWatcher(makeConfig());

      expect(stubWatchEngineFactory).to.have.been.calledOnce();
      expect(stubWatchEngineFactory.firstCall.args[0]).to.equal('./');
      expect(stubWatchEngineFactory.firstCall.args[1]).to.deep.equal({
        ignoreInitial: true,
        skipDirEntryPatterns: [],
      });
    });

    it('clears patterns then registers change, add, remove, and emfile listeners', function() {
      new FileWatcher(makeConfig());

      expect(mockWatcher.clear).to.have.been.calledOnce();
      expect(mockWatcher.on.callCount).to.equal(4);
      expect(mockWatcher.on).to.have.been.calledWith(
        'change',
        sinon.match.func,
      );
      expect(mockWatcher.on).to.have.been.calledWith('add', sinon.match.func);
      expect(mockWatcher.on).to.have.been.calledWith(
        'remove',
        sinon.match.func,
      );
      expect(mockWatcher.on).to.have.been.calledWith(
        'emfile',
        sinon.match.func,
      );
    });

    it('adds default src_files pattern *.js when src_files is not set', function() {
      new FileWatcher(makeConfig());

      expect(mockWatcher.add).to.have.been.calledWith('*.js');
    });

    it('adds explicit src_files', function() {
      new FileWatcher(makeConfig({ src_files: ['a.js', 'b.js'] }));

      expect(mockWatcher.add).to.have.been.calledWith(['a.js', 'b.js']);
    });

    it('adds config file path when file is set', function() {
      new FileWatcher(makeConfig({ file: 'testem.json' }));

      expect(mockWatcher.add).to.have.been.calledWith('testem.json');
      expect(mockWatcher.add).to.have.been.calledWith('*.js');
    });

    it('adds *.js in cwd mode before src_files', function() {
      new FileWatcher(makeConfig({ cwdMode: true, src_files: ['tests.js'] }));

      expect(mockWatcher.add.getCall(0).args[0]).to.equal('*.js');
      expect(mockWatcher.add).to.have.been.calledWith(['tests.js']);
    });

    it('adds watch_files when set', function() {
      new FileWatcher(
        makeConfig({ watch_files: ['extra/**/*.js'], src_files: ['main.js'] }),
      );

      expect(mockWatcher.add).to.have.been.calledWith(['extra/**/*.js']);
      expect(mockWatcher.add).to.have.been.calledWith(['main.js']);
    });

    it('calls ignore when src_files_ignore is set', function() {
      new FileWatcher(makeConfig({ src_files_ignore: ['**/vendor/**'] }));

      expect(mockWatcher.ignore).to.have.been.calledOnce();
      expect(mockWatcher.ignore).to.have.been.calledWith(['**/vendor/**']);
    });
  });

  // FileWatcher does not normalize paths or glob strings; the watch engine receives
  // exactly what Config provides. These tests lock that contract for cross-platform use.
  describe('path and glob passthrough', function() {
    it('passes config file path through unchanged (including Win32-style separators)', function() {
      const confFile = 'C:\\\\project\\\\testem.json';
      new FileWatcher(makeConfig({ file: confFile }));

      expect(mockWatcher.add).to.have.been.calledWith(confFile);
    });

    it('passes src_files as a string without splitting or normalizing', function() {
      const srcFiles = 'impl.js,tests.js';
      new FileWatcher(makeConfig({ src_files: srcFiles }));

      expect(mockWatcher.add).to.have.been.calledWith(srcFiles);
    });

    it('passes src_files arrays with mixed slash styles in glob patterns', function() {
      const patterns = ['src/**/*.js', 'lib\\\\**\\\\*.ts', 'vendor/**/x.js'];
      new FileWatcher(makeConfig({ src_files: patterns }));

      expect(mockWatcher.add).to.have.been.calledWith(patterns);
    });

    it('passes watch_files with ** and backslash segments unchanged', function() {
      const watchFiles = ['packages\\\\**\\\\*.js', 'assets/**/*.css'];
      new FileWatcher(
        makeConfig({ watch_files: watchFiles, src_files: ['main.js'] }),
      );

      expect(mockWatcher.add).to.have.been.calledWith(watchFiles);
    });

    it('passes src_files_ignore patterns unchanged (mixed separators)', function() {
      const ignore = ['**/node_modules/**', 'dist\\\\**', '!**/keep.js'];
      new FileWatcher(makeConfig({ src_files_ignore: ignore }));

      expect(mockWatcher.ignore).to.have.been.calledWith(ignore);
    });

    it('forwards add() using path.win32.join so Win32-shaped paths are preserved', function() {
      const fw = new FileWatcher(makeConfig());
      const joined = path.win32.join('C:', 'workspace', 'pkg', 'src', 'a.js');

      fw.add(joined);

      expect(mockWatcher.add).to.have.been.calledWith(joined);
    });

    it('forwards add() using path.posix.join for POSIX-shaped paths', function() {
      const fw = new FileWatcher(makeConfig());
      const joined = path.posix.join('/home', 'u', 'proj', 'b.js');

      fw.add(joined);

      expect(mockWatcher.add).to.have.been.calledWith(joined);
    });
  });

  describe('fileChanged (via underlying change/add/remove)', function() {
    it('emits fileChanged with the path when change fires', function() {
      const fw = new FileWatcher(makeConfig());
      const spy = sinon.spy();
      fw.on('fileChanged', spy);

      getHandler('change')('/project/foo.js');

      expect(spy).to.have.been.calledOnceWith('/project/foo.js');
    });

    it('emits fileChanged when add fires', function() {
      const fw = new FileWatcher(makeConfig());
      const spy = sinon.spy();
      fw.on('fileChanged', spy);

      getHandler('add')('/project/new.js');

      expect(spy).to.have.been.calledOnceWith('/project/new.js');
    });

    it('emits fileChanged when remove fires', function() {
      const fw = new FileWatcher(makeConfig());
      const spy = sinon.spy();
      fw.on('fileChanged', spy);

      getHandler('remove')('/project/gone.js');

      expect(spy).to.have.been.calledOnceWith('/project/gone.js');
    });
  });

  describe('onFileChanged', function() {
    it('emits fileChanged with the given path', function() {
      const fw = new FileWatcher(makeConfig());
      const spy = sinon.spy();
      fw.on('fileChanged', spy);

      fw.onFileChanged('manual.js');

      expect(spy).to.have.been.calledOnceWith('manual.js');
    });
  });

  describe('EMFILE', function() {
    it('emits EMFILE when the underlying watcher fires emfile', function() {
      const fw = new FileWatcher(makeConfig());
      const spy = sinon.spy();
      fw.on('EMFILE', spy);

      getHandler('emfile')();

      expect(spy).to.have.been.calledOnce();
    });

    it('onEMFILE emits EMFILE', function() {
      const fw = new FileWatcher(makeConfig());
      const spy = sinon.spy();
      fw.on('EMFILE', spy);

      fw.onEMFILE();

      expect(spy).to.have.been.calledOnce();
    });
  });

  describe('add', function() {
    it('forwards to the underlying watcher', function() {
      const fw = new FileWatcher(makeConfig());

      fw.add('/abs/path/to/file.js');

      expect(mockWatcher.add).to.have.been.calledWith('/abs/path/to/file.js');
    });
  });
});
