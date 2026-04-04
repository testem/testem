const path = require('path');
const EventEmitter = require('events').EventEmitter;
const { Minimatch } = require('minimatch');

const assertConcreteFileWatchAddPath = require('./utils/assert_concrete_file_watch_add_path');
const isEmfileError = require('./utils/is_emfile_error');
const { convertToPosix } = require('./utils/posix');
const {
  buildWatchGlobPolicy,
  pathMatchesWatchTarget,
} = require('./utils/file_watch_glob_policy');

function includePatternHasGlobMagic(pattern) {
  return new Minimatch(pattern, { dot: true }).hasMagic();
}

function resolvedPathIsUnderCwd(resolved) {
  const rel = path.relative(process.cwd(), resolved);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

class FileWatcher extends EventEmitter {
  constructor(config) {
    super();

    const policy = buildWatchGlobPolicy(config);
    this._watchPolicy = policy;
    this._explicitWatchRelPaths = new Set();
    const opts = { ignoreInitial: true };
    if (policy.ignorePatterns.length) {
      opts.ignored = policy.ignorePatterns;
    }

    this.fileWatcher = FileWatcher.createWatcher('.', opts);
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
   * @param {string} file
   * @returns {Promise<void>}
   */
  async add(file) {
    await assertConcreteFileWatchAddPath(file, this);
    const rel = convertToPosix(
      path.relative(
        process.cwd(),
        path.resolve(process.cwd(), file),
      ),
    );
    this._explicitWatchRelPaths.add(rel);
    this.fileWatcher.add(file);
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
