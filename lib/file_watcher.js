const path = require('path');
const EventEmitter = require('events').EventEmitter;
const { hasMagic } = require('glob');
const { Minimatch } = require('minimatch');

const isEmfileError = require('./utils/is_emfile_error');
const { convertToPosix } = require('./utils/posix');
const {
  buildWatchGlobPolicy,
  pathMatchesWatchTarget,
} = require('./utils/file_watch_glob_policy');

/** @private Only {@link FileWatcher.create} may construct instances. */
const kInternal = Symbol('FileWatcher.internal');

function includePatternHasGlobMagic(pattern) {
  return new Minimatch(pattern, { dot: true }).hasMagic();
}

function resolvedPathIsUnderCwd(resolved) {
  const rel = path.relative(process.cwd(), resolved);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

/**
 * Whether chokidar's `all` event (add/addDir) refers to the same path as `file` / `absTarget`.
 */
function dynamicAddEventMatchesPath(watchedPath, file, absTarget) {
  const absWatched = path.resolve(watchedPath);
  const relWatched = convertToPosix(
    path.relative(process.cwd(), absWatched),
  );
  const relTarget = convertToPosix(
    path.relative(process.cwd(), absTarget),
  );
  return (
    absWatched === absTarget ||
    relWatched === relTarget ||
    watchedPath === file
  );
}

class FileWatcher extends EventEmitter {
  /**
   * @param {{ get: function(string): *, isCwdMode: function(): boolean }} config
   * @param {symbol} internalToken
   */
  constructor(config, internalToken) {
    super();

    if (internalToken !== kInternal) {
      throw new TypeError(
        'FileWatcher is not constructable; use FileWatcher.create(config)',
      );
    }

    const policy = buildWatchGlobPolicy(config);
    this._watchPolicy = policy;
    this._explicitWatchRelPaths = new Set();
    const opts = { ignoreInitial: true };
    if (policy.ignorePatterns.length) {
      opts.ignored = policy.ignorePatterns;
    }

    this.fileWatcher = FileWatcher.createWatcher('.', opts);

    let readySettled = false;
    this._readyPromise = new Promise((resolve, reject) => {
      this.fileWatcher.once('ready', () => {
        readySettled = true;
        resolve();
      });
      this.fileWatcher.once('error', (err) => {
        if (readySettled || isEmfileError(err)) {
          return;
        }
        readySettled = true;
        reject(err);
      });
    });

    for (let i = 0; i < policy.includePatterns.length; i++) {
      const pattern = policy.includePatterns[i];
      if (includePatternHasGlobMagic(pattern)) {
        continue;
      }
      const resolved = path.resolve(process.cwd(), pattern);
      if (!resolvedPathIsUnderCwd(resolved)) {
        this.fileWatcher.add(path.normalize(pattern));
      }
    }

    const onFileChanged = this.onChokidarFsEvent.bind(this);
    this.fileWatcher.on('change', onFileChanged);
    this.fileWatcher.on('add', onFileChanged);
    this.fileWatcher.on('unlink', onFileChanged);
    this.fileWatcher.on('unlinkDir', onFileChanged);
    this.fileWatcher.on('error', (err) => {
      if (isEmfileError(err)) {
        this.onEMFILE();
      }
    });
  }

  /**
   * Creates a file watcher and waits until the underlying chokidar instance is ready.
   *
   * @param {{ get: function(string): *, isCwdMode: function(): boolean }} config
   * @returns {Promise<FileWatcher>}
   */
  static async create(config) {
    const fw = new FileWatcher(config, kInternal);
    await fw._readyPromise;
    return fw;
  }

  onChokidarFsEvent(filePath) {
    const resolved = path.resolve(filePath);
    const posixRel = convertToPosix(
      path.relative(process.cwd(), resolved),
    );
    if (
      pathMatchesWatchTarget(posixRel, this._watchPolicy) ||
      this._explicitWatchRelPaths.has(posixRel)
    ) {
      this.onFileChanged(filePath);
    }
  }

  onFileChanged(filePath) {
    this.emit('fileChanged', filePath);
  }

  onEMFILE() {
    this.emit('EMFILE');
  }

  /**
   * Used when `add` fails (validation or chokidar): tear down the watcher, then rethrow.
   * @param {Error} err
   * @returns {Promise<never>}
   */
  async _closeAfterFailedAdd(err) {
    try {
      await this.close();
    } catch {
      // ignore close errors; primary error is `err`
    }
    throw err;
  }

  /**
   * `add` is for concrete paths (e.g. a file the server is serving). Glob patterns belong in
   * config / {@link buildWatchGlobPolicy}, not here.
   *
   * @param {string} file
   * @returns {Promise<void>}
   */
  async _validateConcreteAddPath(file) {
    if (typeof file !== 'string') {
      await this._closeAfterFailedAdd(
        new TypeError('FileWatcher.add expects a string path'),
      );
    }
    if (file.length === 0) {
      await this._closeAfterFailedAdd(
        new TypeError('FileWatcher.add expects a non-empty path'),
      );
    }
    if (hasMagic(file, { magicalBraces: true })) {
      await this._closeAfterFailedAdd(
        new TypeError(
          'FileWatcher.add does not accept glob patterns; pass a concrete file path: ' +
            file,
        ),
      );
    }
  }

  /**
   * Chokidar's `add()` schedules async work and may surface failures via `error` instead of
   * throwing. Wait for that work to settle: first matching `add`/`addDir` on `all`, or `error`,
   * or a timeout when chokidar finishes without an event (e.g. ENOENT — no `error` emitted).
   *
   * @param {string} file
   * @returns {Promise<void>}
   */
  async _awaitChokidarDynamicAdd(file) {
    const engine = this.fileWatcher;
    const absTarget = path.resolve(process.cwd(), file);
    let onError;
    let onAll;
    let timeoutId;

    const cleanup = () => {
      if (onError) {
        engine.removeListener('error', onError);
      }
      if (onAll) {
        engine.removeListener('all', onAll);
      }
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    };

    await new Promise((resolve, reject) => {
      let settled = false;

      const finish = (err) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      };

      onError = (err) => {
        finish(err);
      };
      engine.prependOnceListener('error', onError);

      onAll = (event, watchedPath) => {
        if (event === 'add' || event === 'addDir') {
          if (dynamicAddEventMatchesPath(watchedPath, file, absTarget)) {
            finish();
          }
        }
      };
      engine.on('all', onAll);

      // When chokidar finishes without an `all` add/addDir for this path (e.g. already under
      // watch, or ENOENT with no error event), settle after a bounded wait.
      timeoutId = setTimeout(() => finish(), 1000);

      try {
        engine.add(file);
      } catch (err) {
        finish(err);
      }
    });
  }

  /**
   * @param {string} file
   * @returns {Promise<void>}
   */
  async add(file) {
    await this._validateConcreteAddPath(file);
    const rel = convertToPosix(
      path.relative(
        process.cwd(),
        path.resolve(process.cwd(), file),
      ),
    );
    this._explicitWatchRelPaths.add(rel);
    try {
      await this._awaitChokidarDynamicAdd(file);
    } catch (err) {
      await this._closeAfterFailedAdd(err);
    }
  }

  /**
   * Stops the underlying watch engine (closes fs.watch handles, etc.).
   * Safe to call more than once.
   *
   * @returns {Promise<void>}
   */
  close() {
    if (this.fileWatcher) {
      const engine = this.fileWatcher;
      this.fileWatcher = null;
      return Promise.resolve(engine.close()).then(() => {
        this.removeAllListeners();
      });
    }
    this.removeAllListeners();
    return Promise.resolve();
  }
}

FileWatcher.createWatcher = function createWatcher(rootPath, opts) {
  return require('chokidar').watch(rootPath, opts);
};

module.exports = FileWatcher;
