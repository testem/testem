'use strict';

const sane = require('sane');
const EventEmitter = require('events').EventEmitter;

module.exports = class FileWatcher extends EventEmitter {
  constructor(config) {
    super();

    let globPatterns = [];

    let confFile = config.get('file');
    addPatternToGlobList(globPatterns, confFile);

    if (config.isCwdMode()) {
      addPatternToGlobList(globPatterns, '*.js');
    }

    let watchFiles = config.get('watch_files');
    addPatternToGlobList(globPatterns, watchFiles);

    let srcFiles = config.get('src_files') || '*.js';
    addPatternToGlobList(globPatterns, srcFiles);

    let ignoreFiles = config.get('src_files_ignore');

    let cwd = config.cwd();

    this.fileWatcher = sane(cwd, {
      glob: globPatterns,
      ignored: ignoreFiles
    });

    let onFileChanged = this.onFileChanged.bind(this);
    this.fileWatcher.on('change', onFileChanged);
    this.fileWatcher.on('add', onFileChanged);
    this.fileWatcher.on('delete', onFileChanged);
  }

  onFileChanged(filePath) {
    this.emit('fileChanged', filePath);
  }

  add(file) {
    this.fileWatcher.register(file);
  }
};

function addPatternToGlobList(list, globPattern) {
  if (!globPattern) {
    return;
  }

  if (Array.isArray(globPattern)) {
    globPattern.forEach((globPattern) => list.push(globPattern));
  } else {
    list.push(globPattern);
  }
}
