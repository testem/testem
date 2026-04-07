const { minimatch } = require('minimatch');

/**
 * Match a path against a single glob pattern. Thin wrapper so the matcher
 * implementation (minimatch today, possibly picomatch later) lives in one place.
 *
 * @param {string} filePath - Path to test (forward slashes recommended; callers often use `convertToPosix`).
 * @param {string} pattern - A single glob pattern.
 * @param {import('minimatch').MinimatchOptions} [options] - Passed through to the matcher.
 * @returns {boolean}
 */
function pathMatchesPattern(filePath, pattern, options) {
  if (pattern === null || pattern === undefined || pattern === '') {
    return false;
  }
  return minimatch(filePath, pattern, options);
}

/**
 * True if `filePath` matches **any** non-empty pattern in the list.
 *
 * @param {string} filePath
 * @param {string[]} patterns
 * @param {import('minimatch').MinimatchOptions} [options]
 * @returns {boolean}
 */
function pathMatchesAny(filePath, patterns, options) {
  if (!patterns || patterns.length === 0) {
    return false;
  }
  return patterns.some(function(p) {
    return p && pathMatchesPattern(filePath, p, options);
  });
}

module.exports = {
  pathMatchesPattern,
  pathMatchesAny,
};
