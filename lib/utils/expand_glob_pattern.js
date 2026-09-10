const { glob } = require('node:fs/promises');

/**
 * Expand one resolved pattern to matching file paths using the project glob backend.
 *
 * Callers pass POSIX-style paths (see `convertToPosix`); this keeps options aligned
 * with native `fs.glob` and allows swapping the implementation later without touching Config.
 *
 * @param {string} resolvedPatternPosix - Single pattern (already resolved to absolute or cwd-relative form, forward slashes).
 * @param {string[]} [ignorePatternsPosix] - Ignore globs in POSIX form; empty entries are dropped.
 * @returns {Promise<string[]>} Matching paths, sorted lexicographically (same ordering as before extraction).
 */
async function expandGlobPattern(resolvedPatternPosix, ignorePatternsPosix) {
  const exclude = (ignorePatternsPosix || []).filter(Boolean);
  const files = await Array.fromAsync(glob(resolvedPatternPosix, { exclude }));
  return files.sort();
}

module.exports = expandGlobPattern;
