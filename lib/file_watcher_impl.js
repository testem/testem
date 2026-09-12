/**
 * Internal `FileWatcher` implementation (see {@link module:lib/file_watcher} for the public API).
 *
 * **Third-party pieces in use today:** `chokidar` (filesystem watch engine), `glob` (`hasMagic`
 * for validating concrete `add` paths), and `minimatch` (include-pattern magic checks). Policy
 * lists and matching live largely in {@link module:lib/utils/file_watch_glob_policy}.
 *
 * Nothing here assumes a single vendor forever: the engine is created only through
 * {@link FileWatcherImpl.createWatcher} (with `chokidar` loaded lazily there), and glob/minimatch
 * are confined to small helpers—so swapping the watcher, glob detection, or minimatch usage is
 * meant to be localized work rather than a rewrite.
 *
 * @module lib/file_watcher_impl
 */
const path = require('path');
const EventEmitter = require('events').EventEmitter;
const { hasMagic } = require('glob');
const { Minimatch } = require('minimatch');

const isEmfileError = require('./utils/is_emfile_error');
const { convertToPosix } = require('./utils/posix');
const { pathMatchesAny } = require('./utils/path_pattern_match');
const {
  buildWatchGlobPolicy,
  pathMatchesWatchTarget,
} = require('./utils/file_watch_glob_policy');

/** @private Only {@link FileWatcherImpl.create} may construct instances. */
const kInternal = Symbol('FileWatcherImpl.internal');

/**
 * Directories the engine never descends into unless the config asks for them. Scanning them is
 * both slow and costly in open file descriptors: on macOS, once a process holds more descriptors
 * than `OPEN_MAX` (10240), `posix_spawn` rejects pipe stdio with `EBADF`, so launching a browser
 * or a TAP child fails outright.
 */
const DEFAULT_IGNORED_DIRS = ['node_modules', '.git'];

function relFromCwd(watchedPath) {
  return convertToPosix(
    path.relative(process.cwd(), path.resolve(watchedPath)),
  );
}

function hasSegmentIn(relPosix, dirs) {
  return relPosix.split('/').some((segment) => dirs.includes(segment));
}

/**
 * Config wins per directory: an include pattern reaching into `node_modules` keeps that scan
 * alive without also re-enabling `.git`.
 */
function defaultIgnoredDirsToApply(includePatterns) {
  const posixIncludes = includePatterns.map((pattern) =>
    convertToPosix(String(pattern)),
  );
  return DEFAULT_IGNORED_DIRS.filter(
    (dir) => !posixIncludes.some((pattern) => hasSegmentIn(pattern, [dir])),
  );
}

function includePatternHasGlobMagic(pattern) {
  return new Minimatch(pattern, { dot: true }).hasMagic();
}

function resolvedPathIsUnderCwd(resolved) {
  const rel = path.relative(process.cwd(), resolved);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

/**
 * Whether the watch engine's `all` event (add/addDir) refers to the same path as `file` /
 * `absTarget`.
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

class FileWatcherImpl extends EventEmitter {
  /**
   * @param {{ get: function(string): *, isCwdMode: function(): boolean }} config
   * @param {symbol} internalToken
   */
  constructor(config, internalToken) {
    super();

    if (internalToken !== kInternal) {
      throw new TypeError(
        'FileWatcherImpl is not constructable; use FileWatcherImpl.create(config)',
      );
    }

    const policy = buildWatchGlobPolicy(config);
    this._watchPolicy = policy;
    this._explicitWatchRelPaths = new Set();
    this._watchExemptRelPaths = new Set();
    const opts = {
      ignoreInitial: true,
      ignored: this._buildIgnoreMatcher(policy),
    };

    this.fileWatcher = FileWatcherImpl.createWatcher('.', opts);
    this._pendingAdds = new Map();

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

    const onEngineFsEvent = this.onEngineFsEvent.bind(this);
    this.fileWatcher.on('change', onEngineFsEvent);
    this.fileWatcher.on('add', onEngineFsEvent);
    this.fileWatcher.on('unlink', onEngineFsEvent);
    this.fileWatcher.on('unlinkDir', onEngineFsEvent);
    this.fileWatcher.on('error', (err) => {
      if (isEmfileError(err)) {
        this.onEMFILE();
        return;
      }
      this._failPendingAdds(err);
    });
    this.fileWatcher.on('all', (event, watchedPath) => {
      if (event === 'add' || event === 'addDir') {
        this._settlePendingAdds(watchedPath);
      }
    });
  }

  /**
   * The engine takes a predicate rather than globs: chokidar dropped glob support in v4, so an
   * array of patterns like `node_modules/**` is compared literally and never matches anything.
   *
   * @param {{ includePatterns: string[], ignorePatterns: string[] }} policy
   * @returns {function(string): boolean}
   */
  _buildIgnoreMatcher(policy) {
    const defaultIgnoredDirs = defaultIgnoredDirsToApply(policy.includePatterns);

    return (watchedPath) => {
      const rel = relFromCwd(watchedPath);
      if (rel === '' || rel.startsWith('..')) {
        return false;
      }
      if (this._watchExemptRelPaths.has(rel)) {
        return false;
      }
      if (hasSegmentIn(rel, defaultIgnoredDirs)) {
        return true;
      }
      return pathMatchesAny(rel, policy.ignorePatterns, { dot: true });
    };
  }

  /** Keep an explicitly added path watchable, along with the directories leading to it. */
  _exemptFromIgnore(relPosix) {
    let current = relPosix;
    while (current && current !== '.' && current !== '/') {
      this._watchExemptRelPaths.add(current);
      const parent = path.posix.dirname(current);
      if (parent === current) {
        break;
      }
      current = parent;
    }
  }

  _removePendingAdd(absTarget, item) {
    const list = this._pendingAdds.get(absTarget);
    if (!list) {
      return;
    }
    const idx = list.indexOf(item);
    if (idx !== -1) {
      list.splice(idx, 1);
    }
    if (list.length === 0) {
      this._pendingAdds.delete(absTarget);
    }
  }

  _settlePendingAdds(watchedPath) {
    for (const [absTarget, list] of this._pendingAdds) {
      const matched = list.filter((item) =>
        dynamicAddEventMatchesPath(watchedPath, item.file, absTarget)
      );
      if (matched.length === 0) {
        continue;
      }
      matched.forEach((item) => {
        if (item.timeoutId !== undefined) {
          clearTimeout(item.timeoutId);
        }
        this._removePendingAdd(absTarget, item);
        item.resolve();
      });
    }
  }

  _failPendingAdds(err) {
    for (const [absTarget, list] of this._pendingAdds) {
      list.slice().forEach((item) => {
        if (item.timeoutId !== undefined) {
          clearTimeout(item.timeoutId);
        }
        this._removePendingAdd(absTarget, item);
        item.reject(err);
      });
    }
  }

  /**
   * @param {{ get: function(string): *, isCwdMode: function(): boolean }} config
   * @returns {Promise<FileWatcherImpl>}
   */
  static async create(config) {
    const fw = new FileWatcherImpl(config, kInternal);
    await fw._readyPromise;
    return fw;
  }

  onEngineFsEvent(filePath) {
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
   * Wait for dynamic `add` on the engine to settle (`all` add/addDir, `error`, or timeout).
   *
   * @param {string} file
   * @returns {Promise<void>}
   */
  async _awaitEngineDynamicAdd(file) {
    const engine = this.fileWatcher;
    const absTarget = path.resolve(process.cwd(), file);

    await new Promise((resolve, reject) => {
      let settled = false;
      const item = {
        file: file,
        timeoutId: undefined,
        resolve() {
          if (settled) {
            return;
          }
          settled = true;
          resolve();
        },
        reject(err) {
          if (settled) {
            return;
          }
          settled = true;
          reject(err);
        }
      };

      let list = this._pendingAdds.get(absTarget);
      if (!list) {
        list = [];
        this._pendingAdds.set(absTarget, list);
      }
      list.push(item);

      item.timeoutId = setTimeout(() => {
        this._removePendingAdd(absTarget, item);
        item.resolve();
      }, 1000);

      try {
        engine.add(file);
      } catch (err) {
        clearTimeout(item.timeoutId);
        this._removePendingAdd(absTarget, item);
        item.reject(err);
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
    this._exemptFromIgnore(rel);
    try {
      await this._awaitEngineDynamicAdd(file);
    } catch (err) {
      await this._closeAfterFailedAdd(err);
    }
  }

  /**
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

/** Lazy `require` keeps chokidar off the load path until a real watcher is built (e.g. tests stub this). */
FileWatcherImpl.createWatcher = function createWatcher(rootPath, opts) {
  const watcher = require('chokidar').watch(rootPath, opts);
  if (typeof watcher.setMaxListeners === 'function') {
    watcher.setMaxListeners(0);
  }
  return watcher;
};

module.exports = FileWatcherImpl;
