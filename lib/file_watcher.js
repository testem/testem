

const fireworm = require('fireworm');
const EventEmitter = require('events').EventEmitter;

const { buildWatchGlobPolicy } = require('./utils/file_watch_glob_policy');

module.exports = class FileWatcher extends EventEmitter {
  constructor(config) {
    super();

    this.fileWatcher = fireworm('./', {
      ignoreInitial: true,
      skipDirEntryPatterns: []
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
    this.fileWatcher.add(file);
  }
};
