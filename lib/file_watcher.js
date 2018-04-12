'use strict';

var fireworm = require('fireworm');
var EventEmitter = require('events').EventEmitter;

class FileWatcher extends EventEmitter {
  constructor(config) {
    super();

    this.fileWatcher = fireworm('./', {
      ignoreInitial: true,
      skipDirEntryPatterns: []
    });
    var onFileChanged = this.onFileChanged.bind(this);
    this.fileWatcher.on('change', onFileChanged);
    this.fileWatcher.on('add', onFileChanged);
    this.fileWatcher.on('remove', onFileChanged);
    this.fileWatcher.on('emfile', this.onEMFILE.bind(this));

    var watchFiles = config.get('watch_files');
    this.fileWatcher.clear();
    var confFile = config.get('file');
    if (confFile) {
      this.fileWatcher.add(confFile);
    }
    if (config.isCwdMode()) {
      this.fileWatcher.add('*.js');
    }
    if (watchFiles) {
      this.fileWatcher.add(watchFiles);
    }
    var srcFiles = config.get('src_files') || '*.js';
    this.fileWatcher.add(srcFiles);
    var ignoreFiles = config.get('src_files_ignore');
    if (ignoreFiles) {
      this.fileWatcher.ignore(ignoreFiles);
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
}

module.exports = FileWatcher;
