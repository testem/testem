/**
 * Detects EMFILE errors from `fs.watch` / watcher backends (e.g. chokidar `error`).
 * Fireworm uses a dedicated `emfile` event; other engines surface this via `error`.
 *
 * @param {unknown} err
 * @returns {boolean}
 */
function isEmfileError(err) {
  return (
    err !== null &&
    typeof err === 'object' &&
    /** @type {{ code?: string }} */ (err).code === 'EMFILE'
  );
}

module.exports = isEmfileError;
