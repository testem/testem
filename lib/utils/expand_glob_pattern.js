const { glob } = require('glob');

/**
 * Expand one resolved pattern to matching file paths using the project glob backend.
 *
 * Callers pass POSIX-style paths (see `convertToPosix`); this keeps options aligned
 * with `glob` today and allows swapping the implementation later without touching Config.
 *
 * @param {string} resolvedPatternPosix - Single pattern (already resolved to absolute or cwd-relative form, forward slashes).
 * @param {string[]} [ignorePatternsPosix] - Ignore globs in POSIX form; empty entries are dropped.
 * @returns {Promise<string[]>} Matching paths, sorted lexicographically (same ordering as before extraction).
 */
async function expandGlobPattern(resolvedPatternPosix, ignorePatternsPosix) {
  const ignore = (ignorePatternsPosix || []).filter(Boolean);
  const files = await glob(resolvedPatternPosix, { ignore });
  return files.slice().sort();
}

module.exports = expandGlobPattern;
