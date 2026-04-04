/**
 * TEMPORARY — fireworm → chokidar v5 migration
 *
 * While Testem still used fireworm, `FileWatcher#add` could receive glob-like strings.
 * Chokidar v5 does not treat `add(path)` as a glob API; globs stay in config / the separate
 * glob layer. This module enforces “concrete path only” until the migration is finished,
 * then its checks should be folded into the long-term design or removed if redundant.
 */
const { hasMagic } = require('glob');

/**
 * `FileWatcher#add` is for concrete paths (e.g. a file the server is serving).
 * Glob / minimatch patterns belong in config and {@link buildWatchGlobPolicy}, not here.
 *
 * On any validation failure, {@link FileWatcher#close} is called on `fileWatcher` before
 * throwing so invalid `add` does not leave fs.watch state behind. {@link FileWatcher#close}
 * tears down the engine synchronously before its returned promise resolves (so handles are
 * released before this function throws).
 *
 * @param {string} file
 * @param {{ close: function(): Promise<void> }} fileWatcher
 */
function assertConcreteFileWatchAddPath(file, fileWatcher) {
  function fail(err) {
    void fileWatcher.close().catch(function() {});
    throw err;
  }

  if (typeof file !== 'string') {
    fail(new TypeError('FileWatcher.add expects a string path'));
  }
  if (file.length === 0) {
    fail(new TypeError('FileWatcher.add expects a non-empty path'));
  }
  if (hasMagic(file, { magicalBraces: true })) {
    fail(
      new TypeError(
        'FileWatcher.add does not accept glob patterns; pass a concrete file path: ' +
          file,
      ),
    );
  }
}

module.exports = assertConcreteFileWatchAddPath;
