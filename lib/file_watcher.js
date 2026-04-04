const fireworm = require('fireworm');
const EventEmitter = require('events').EventEmitter;

const assertConcreteFileWatchAddPath = require('./utils/assert_concrete_file_watch_add_path');
const { buildWatchGlobPolicy } = require('./utils/file_watch_glob_policy');

module.exports = class FileWatcher extends EventEmitter {
  constructor(config) {
    super();

    this.fileWatcher = fireworm('./', {
      ignoreInitial: true,
      skipDirEntryPatterns: [],
    });
    let onFileChanged = this.onFileChanged.bind(this);
    this.fileWatcher.on('change', onFileChanged);
    this.fileWatcher.on('add', onFileChanged);
    this.fileWatcher.on('remove', onFileChanged);
    this.fileWatcher.on('emfile', this.onEMFILE.bind(this));

    this.fileWatcher.clear();
    const policy = buildWatchGlobPolicy(config);
    if (policy.includePatterns.length) {
      this.fileWatcher.add(...policy.includePatterns);
    }
    if (policy.ignorePatterns.length) {
      this.fileWatcher.ignore(...policy.ignorePatterns);
    }
  }

  onFileChanged(filePath) {
    this.emit('fileChanged', filePath);
  }

  onEMFILE() {
    this.emit('EMFILE');
  }

  add(file) {
    assertConcreteFileWatchAddPath(file, this);
    this.fileWatcher.add(file);
  }

  /**
   * Stops the underlying watch engine (closes fs.watch handles, etc.).
   * Safe to call more than once.
   */
  close() {
    if (this.fileWatcher) {
      const engine = this.fileWatcher;
      if (engine.dir && typeof engine.dir.destroy === 'function') {
        engine.dir.destroy();
      }
      engine.removeAllListeners();
      this.fileWatcher = null;
    }
    this.removeAllListeners();
  }
};
