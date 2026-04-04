const EventEmitter = require('events').EventEmitter;

const Impl = require('./file_watcher_impl');

const kCompose = Symbol('FileWatcher.compose');

/**
 * Coordinates file watching for Testem: it observes the current working directory (and any
 * non-glob paths from config that live outside it), applies the same include / ignore rules as
 * the rest of the app (`src_files`, `src_files_ignore`, `watch_files`, etc.), and reports when
 * paths that matter for the test run change.
 *
 * Listen for {@link FileWatcher#event:fileChanged} to react to changes, and optionally for
 * {@link FileWatcher#event:EMFILE} when the process hits open-file limits.
 *
 * ### Construction
 *
 * **Do not call `new FileWatcher(...)`.** The constructor is not part of the public API; it
 * exists only for internal wiring and will always throw if you invoke it from outside this
 * module. Obtain instances exclusively via {@link FileWatcher.create} with a config object that
 * exposes `get(key)` and `isCwdMode()` (the same shape as Testem’s `Config`).
 *
 * ### Async vs synchronous
 *
 * **Return a `Promise` — use `await`, `.then()`, or `.catch()`:**
 * {@link FileWatcher.create}, {@link FileWatcher#add}, {@link FileWatcher#close}.
 *
 * **Synchronous:** {@link FileWatcher#onFileChanged}, {@link FileWatcher#onEMFILE}, and
 * inherited `EventEmitter` methods (`on`, `once`, `emit`, `removeListener`, …).
 *
 * @hideconstructor
 * @fires FileWatcher#event:fileChanged
 * @fires FileWatcher#event:EMFILE
 */
class FileWatcher extends EventEmitter {
  /**
   * Not for public use. Application code must use {@link FileWatcher.create} instead; calling
   * `new FileWatcher` directly always throws.
   *
   * @private
   * @param {*} impl Internal implementation instance.
   * @param {symbol} token Internal composition token (not exposed).
   */
  constructor(impl, token) {
    super();
    if (token !== kCompose) {
      throw new TypeError(
        'FileWatcher is not constructable; use FileWatcher.create(config)',
      );
    }
    this._impl = impl;
    impl.on('fileChanged', (filePath) => this.emit('fileChanged', filePath));
    impl.on('EMFILE', () => this.emit('EMFILE'));
  }

  /**
   * Create a watcher, wait until the underlying engine has finished its initial setup, and
   * return a ready-to-use `FileWatcher`. This is the **only** supported way to obtain an
   * instance.
   *
   * @param {{ get: function(string): *, isCwdMode: function(): boolean }} config Testem-style
   *   config (typically a `Config` instance): `get` reads keys such as `src_files`,
   *   `src_files_ignore`, `watch_files`, `file`, `disable_watching`; `isCwdMode` reflects cwd
   *   mode.
   * @returns {Promise<FileWatcher>} Resolves with a connected watcher once startup is complete.
   *   **Await** this promise; if the engine fails during startup, the promise rejects.
   */
  static async create(config) {
    const impl = await Impl.create(config);
    return new FileWatcher(impl, kCompose);
  }

  /**
   * Request that a **concrete** filesystem path be watched in addition to the configured
   * patterns (for example, a file the dev server started serving after startup). Glob or
   * minimatch strings are not accepted here — only real paths; pattern-based includes stay in
   * config.
   *
   * @param {string} file Path relative to the current working directory or absolute, as
   *   accepted by the engine.
   * @returns {Promise<void>} Settles when the engine has finished the add request. **Await**
   *   this promise (or attach `.catch()`) so validation errors, engine errors, and internal
   *   teardown on failure are observed.
   */
  add(file) {
    return this._impl.add(file);
  }

  /**
   * Tear down the watcher: close the engine, release OS watch handles, and remove listeners on
   * this `FileWatcher`. Safe to call more than once; subsequent calls resolve promptly.
   *
   * @returns {Promise<void>} Resolves when shutdown is complete. **Await** if later code must
   *   run only after handles are released.
   */
  close() {
    return Promise.resolve(this._impl.close()).then(() => {
      this.removeAllListeners();
    });
  }

  /**
   * Manually signal that a path changed, for the same listeners as a real `fileChanged` event.
   * Used in tests and narrow control flows; normal file edits are reported automatically by the
   * engine.
   *
   * @param {string} filePath Path that should be treated as changed.
   * @returns {void}
   */
  onFileChanged(filePath) {
    return this._impl.onFileChanged(filePath);
  }

  /**
   * Manually emit the `EMFILE` condition (too many open files) for listeners that show user
   * guidance. The real engine also surfaces this when appropriate.
   *
   * @returns {void}
   */
  onEMFILE() {
    return this._impl.onEMFILE();
  }
}

module.exports = FileWatcher;
