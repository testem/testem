const path = require('path');

const expect = require('chai').expect;
const sinon = require('sinon');

const fileWatcherModulePath = require.resolve('../lib/file_watcher.js');

describe('FileWatcher', function() {
  let sandbox;
  let mockWatcher;
  let createWatcherStub;
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
      once: sandbox.stub().callsFake(function(event, listener) {
        if (event === 'ready') {
          listener();
        }
      }),
      add: sandbox.stub(),
      close: sandbox.stub().callsFake(function() {
        return Promise.resolve();
      }),
    };
    delete require.cache[fileWatcherModulePath];
    FileWatcher = require('../lib/file_watcher.js');
    createWatcherStub = sandbox
      .stub(FileWatcher, 'createWatcher')
      .callsFake(function() {
        return mockWatcher;
      });
  });

  afterEach(function() {
    delete require.cache[fileWatcherModulePath];
    sandbox.restore();
  });

  describe('create', function() {
    it('is not constructable with new', function() {
      expect(() => new FileWatcher(makeConfig())).to.throw(
        TypeError,
        /FileWatcher\.create/,
      );
    });

    it('watches cwd only; glob include patterns are applied via policy filter', async function() {
      await FileWatcher.create(makeConfig());

      expect(mockWatcher.once).to.have.been.calledWith(
        'ready',
        sinon.match.func,
      );
      expect(createWatcherStub).to.have.been.calledOnce();
      expect(createWatcherStub.firstCall.args[0]).to.equal('.');
      expect(createWatcherStub.firstCall.args[1]).to.deep.equal({
        ignoreInitial: true,
      });
      expect(mockWatcher.add).to.not.have.been.called();
    });

    it('registers change, add, unlink, unlinkDir, and error listeners', async function() {
      await FileWatcher.create(makeConfig());

      expect(mockWatcher.on.callCount).to.equal(5);
      expect(mockWatcher.on).to.have.been.calledWith(
        'change',
        sinon.match.func,
      );
      expect(mockWatcher.on).to.have.been.calledWith('add', sinon.match.func);
      expect(mockWatcher.on).to.have.been.calledWith(
        'unlink',
        sinon.match.func,
      );
      expect(mockWatcher.on).to.have.been.calledWith(
        'unlinkDir',
        sinon.match.func,
      );
      expect(mockWatcher.on).to.have.been.calledWith(
        'error',
        sinon.match.func,
      );
    });

    it('uses default src_files pattern *.js when src_files is not set', async function() {
      await FileWatcher.create(makeConfig());

      expect(createWatcherStub.firstCall.args[0]).to.equal('.');
      expect(mockWatcher.add).to.not.have.been.called();
    });

    it('does not pass glob src_files to chokidar add (policy filter instead)', async function() {
      await FileWatcher.create(makeConfig({ src_files: ['a.js', 'b.js'] }));

      expect(mockWatcher.add).to.not.have.been.called();
    });

    it('does not add() glob patterns when file and src_files are set', async function() {
      await FileWatcher.create(makeConfig({ file: 'testem.json' }));

      expect(mockWatcher.add).to.not.have.been.called();
    });

    it('does not add() cwd/src glob literals (policy filter instead)', async function() {
      await FileWatcher.create(makeConfig({ cwdMode: true, src_files: ['tests.js'] }));

      expect(mockWatcher.add).to.not.have.been.called();
    });

    it('does not add() when watch_files and src_files are globs under cwd', async function() {
      await FileWatcher.create(
        makeConfig({ watch_files: ['extra/**/*.js'], src_files: ['main.js'] }),
      );

      expect(mockWatcher.add).to.not.have.been.called();
    });

    it('passes ignored when src_files_ignore is set', async function() {
      await FileWatcher.create(makeConfig({ src_files_ignore: ['**/vendor/**'] }));

      expect(createWatcherStub.firstCall.args[1]).to.deep.equal({
        ignoreInitial: true,
        ignored: ['**/vendor/**'],
      });
    });
  });

  // Policy lists are built the same as before; chokidar only watches '.' plus any
  // non-glob path that resolves outside cwd (see lib/file_watcher.js).
  describe('path and glob passthrough', function() {
    it('keeps config file path in policy (including Win32-style separators)', async function() {
      const confFile = 'C:\\\\project\\\\testem.json';
      const fw = await FileWatcher.create(makeConfig({ file: confFile }));

      expect(fw._watchPolicy.includePatterns).to.include(confFile);
    });

    it('keeps src_files as a string without splitting in policy', async function() {
      const srcFiles = 'impl.js,tests.js';
      const fw = await FileWatcher.create(makeConfig({ src_files: srcFiles }));

      expect(fw._watchPolicy.includePatterns).to.include(srcFiles);
    });

    it('keeps src_files arrays with mixed slash styles in policy', async function() {
      const patterns = ['src/**/*.js', 'lib\\\\**\\\\*.ts', 'vendor/**/x.js'];
      const fw = await FileWatcher.create(makeConfig({ src_files: patterns }));

      expect(fw._watchPolicy.includePatterns).to.deep.equal(patterns);
    });

    it('keeps watch_files and src_files order in policy', async function() {
      const watchFiles = ['packages\\\\**\\\\*.js', 'assets/**/*.css'];
      const fw = await FileWatcher.create(
        makeConfig({ watch_files: watchFiles, src_files: ['main.js'] }),
      );

      expect(fw._watchPolicy.includePatterns).to.deep.equal([
        'packages\\\\**\\\\*.js',
        'assets/**/*.css',
        'main.js',
      ]);
    });

    it('passes src_files_ignore patterns unchanged (mixed separators)', async function() {
      const ignore = ['**/node_modules/**', 'dist\\\\**', '!**/keep.js'];
      await FileWatcher.create(makeConfig({ src_files_ignore: ignore }));

      expect(createWatcherStub.firstCall.args[1].ignored).to.deep.equal(ignore);
    });

    it('forwards add() using path.win32.join so Win32-shaped paths are preserved', async function() {
      const fw = await FileWatcher.create(makeConfig());
      const joined = path.win32.join('C:', 'workspace', 'pkg', 'src', 'a.js');

      await fw.add(joined);

      expect(mockWatcher.add.lastCall.args[0]).to.equal(joined);
    });

    it('forwards add() using path.posix.join for POSIX-shaped paths', async function() {
      const fw = await FileWatcher.create(makeConfig());
      const joined = path.posix.join('/home', 'u', 'proj', 'b.js');

      await fw.add(joined);

      expect(mockWatcher.add.lastCall.args[0]).to.equal(joined);
    });
  });

  describe('fileChanged (via underlying change/add/unlink)', function() {
    it('emits fileChanged with the path when change fires', async function() {
      const fw = await FileWatcher.create(makeConfig());
      const spy = sinon.spy();
      fw.on('fileChanged', spy);

      getHandler('change')('foo.js');

      expect(spy).to.have.been.calledOnceWith('foo.js');
    });

    it('emits fileChanged when add fires', async function() {
      const fw = await FileWatcher.create(makeConfig());
      const spy = sinon.spy();
      fw.on('fileChanged', spy);

      getHandler('add')('new.js');

      expect(spy).to.have.been.calledOnceWith('new.js');
    });

    it('emits fileChanged when unlink fires', async function() {
      const fw = await FileWatcher.create(makeConfig());
      const spy = sinon.spy();
      fw.on('fileChanged', spy);

      getHandler('unlink')('gone.js');

      expect(spy).to.have.been.calledOnceWith('gone.js');
    });
  });

  describe('onFileChanged', function() {
    it('emits fileChanged with the given path', async function() {
      const fw = await FileWatcher.create(makeConfig());
      const spy = sinon.spy();
      fw.on('fileChanged', spy);

      fw.onFileChanged('manual.js');

      expect(spy).to.have.been.calledOnceWith('manual.js');
    });
  });

  describe('EMFILE', function() {
    it('emits EMFILE when the underlying watcher fires error with EMFILE', async function() {
      const fw = await FileWatcher.create(makeConfig());
      const spy = sinon.spy();
      fw.on('EMFILE', spy);

      const err = new Error('EMFILE');
      err.code = 'EMFILE';
      getHandler('error')(err);

      expect(spy).to.have.been.calledOnce();
    });

    it('onEMFILE emits EMFILE', async function() {
      const fw = await FileWatcher.create(makeConfig());
      const spy = sinon.spy();
      fw.on('EMFILE', spy);

      fw.onEMFILE();

      expect(spy).to.have.been.calledOnce();
    });
  });

  describe('add', function() {
    it('forwards to the underlying watcher', async function() {
      const fw = await FileWatcher.create(makeConfig());

      await fw.add('/abs/path/to/file.js');

      expect(mockWatcher.add).to.have.been.calledWith('/abs/path/to/file.js');
    });

    it('rejects glob patterns (single segment)', async function() {
      const fw = await FileWatcher.create(makeConfig());

      let err;
      try {
        await fw.add('*.js');
      } catch (e) {
        err = e;
      }
      expect(err).to.be.instanceOf(TypeError);
      expect(err.message).to.match(/glob patterns/);
      expect(mockWatcher.close).to.have.been.calledOnce();
      expect(fw.fileWatcher).to.equal(null);
    });

    it('rejects glob patterns (nested **)', async function() {
      const fw = await FileWatcher.create(makeConfig());

      let err;
      try {
        await fw.add('src/**/*.js');
      } catch (e) {
        err = e;
      }
      expect(err).to.be.instanceOf(TypeError);
      expect(err.message).to.match(/glob patterns/);
      expect(mockWatcher.close).to.have.been.calledOnce();
      expect(fw.fileWatcher).to.equal(null);
    });

    it('rejects brace expansion when it introduces glob magic', async function() {
      const fw = await FileWatcher.create(makeConfig());

      let err;
      try {
        await fw.add('{a,b}.js');
      } catch (e) {
        err = e;
      }
      expect(err).to.be.instanceOf(TypeError);
      expect(err.message).to.match(/glob patterns/);
      expect(mockWatcher.close).to.have.been.calledOnce();
      expect(fw.fileWatcher).to.equal(null);
    });
  });

  describe('close', function() {
    it('calls close on the underlying watcher', async function() {
      const fw = await FileWatcher.create(makeConfig());

      await fw.close();

      expect(mockWatcher.close).to.have.been.calledOnce();
    });

    it('removes listeners on this instance after the watcher closes', async function() {
      const fw = await FileWatcher.create(makeConfig());

      await fw.close();

      expect(fw.listenerCount('fileChanged')).to.equal(0);
      expect(fw.listenerCount('EMFILE')).to.equal(0);
    });

    it('is idempotent', async function() {
      const fw = await FileWatcher.create(makeConfig());

      await fw.close();
      await fw.close();

      expect(mockWatcher.close).to.have.been.calledOnce();
    });

    it('returns a promise', async function() {
      const fw = await FileWatcher.create(makeConfig());

      const out = fw.close();

      expect(out).to.be.instanceOf(Promise);
      await out;
    });
  });
});
