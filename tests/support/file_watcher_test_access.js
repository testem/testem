/**
 * Test-only access to the internal watch engine behind a `FileWatcher` facade.
 * Do not use outside this repository’s tests.
 *
 * @param {*} fw
 * @returns {*}
 */
function getWatchEngine(fw) {
  return fw._impl.fileWatcher;
}

module.exports = { getWatchEngine };
