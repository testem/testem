const picomatch = require('picomatch');

/**
 * Match a path against a single glob pattern. Thin wrapper so the matcher
 * implementation (picomatch) lives in one place.
 *
 * @param {string} filePath - Path to test (forward slashes recommended; callers often use `convertToPosix`).
 * @param {string} pattern - A single glob pattern.
 * @param {{ dot?: boolean, nocase?: boolean }} [options] - Passed through to picomatch.
 * @returns {boolean}
 */
function pathMatchesPattern(filePath, pattern, options) {
  if (pattern === null || pattern === undefined || pattern === '') {
    return false;
  }
  return picomatch.isMatch(filePath, pattern, options);
}

/**
 * True if `filePath` matches **any** non-empty pattern in the list.
 *
 * @param {string} filePath
 * @param {string[]} patterns
 * @param {{ dot?: boolean, nocase?: boolean }} [options]
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

/**
 * Whether `pattern` contains glob magic. Brace expansion alone is not magic
 * unless `options.magicalBraces` is set (same contract as minimatch `hasMagic`).
 *
 * @param {string} pattern
 * @param {{ magicalBraces?: boolean }} [options]
 * @returns {boolean}
 */
function patternHasGlobMagic(pattern, options) {
  if (pattern === null || pattern === undefined || pattern === '') {
    return false;
  }
  const scanned = picomatch.scan(String(pattern));
  if (scanned.isBrace) {
    const stripped = String(pattern).replace(/\{[^{}]*\}/g, '_');
    if (picomatch.scan(stripped).isGlob) {
      return true;
    }
    return Boolean(options && options.magicalBraces);
  }
  return scanned.isGlob;
}

module.exports = {
  pathMatchesPattern,
  pathMatchesAny,
  patternHasGlobMagic,
};
