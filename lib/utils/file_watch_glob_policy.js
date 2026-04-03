const url = require('url');

const expandGlobPattern = require('./expand_glob_pattern');
const { convertToPosix } = require('./posix');
const { pathMatchesAny } = require('./path_pattern_match');

/**
 * Normalize config `src_files`-style values to a list of glob strings.
 * @param {string|string[]|Array<{src: string}>|undefined|null} value
 * @returns {string[]}
 */
function flattenPatternList(value) {
  if (value === undefined || value === null) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map(function(entry) {
      if (typeof entry === 'string') {
        return entry;
      }
      if (entry && typeof entry.src === 'string') {
        return entry.src;
      }
      return String(entry);
    });
  }
  return [String(value)];
}

/**
 * Build the same include / ignore pattern lists used by `FileWatcher` (fireworm today,
 * chokidar filters tomorrow). Single place for glob + ignore semantics.
 *
 * @param {{ get: function(string): *, isCwdMode: function(): boolean }} config
 * @returns {{ includePatterns: string[], ignorePatterns: string[] }}
 */
function buildWatchGlobPolicy(config) {
  const includePatterns = [];

  const confFile = config.get('file');
  if (confFile) {
    includePatterns.push(String(confFile));
  }
  if (config.isCwdMode()) {
    includePatterns.push('*.js');
  }
  const watchFiles = config.get('watch_files');
  if (watchFiles) {
    includePatterns.push(...flattenPatternList(watchFiles));
  }
  const srcFiles = config.get('src_files');
  const srcList = srcFiles !== undefined && srcFiles !== null ? srcFiles : '*.js';
  includePatterns.push(...flattenPatternList(srcList));

  const ignoreRaw = config.get('src_files_ignore');
  const ignorePatterns = ignoreRaw ? flattenPatternList(ignoreRaw) : [];

  return { includePatterns, ignorePatterns };
}

/**
 * Whether a path would be treated as a watched file (matches an include pattern and
 * no ignore pattern). Paths are normalized with {@link convertToPosix} for matching
 * on Windows vs POSIX.
 *
 * @param {string} filePath - Absolute or relative path as emitted by the filesystem / watcher.
 * @param {{ includePatterns: string[], ignorePatterns: string[] }} policy
 * @param {object} [matchOptions] - forwarded to minimatch (via path_pattern_match).
 * @returns {boolean}
 */
function pathMatchesWatchTarget(filePath, policy, matchOptions) {
  const posix = convertToPosix(filePath);
  if (pathMatchesAny(posix, policy.ignorePatterns, matchOptions)) {
    return false;
  }
  return pathMatchesAny(posix, policy.includePatterns, matchOptions);
}

/**
 * Expand all on-disk files matching the watch policy (same idea as `getFileSet` for
 * `src_files`, but driven by the watch policy). Skips `http:` / `https:` URLs; keeps
 * them as literal entries. Uses {@link expandGlobPattern} with `config.resolvePath`.
 *
 * @param {{ get: function(string): *, cwd: function(): string, resolvePath: function(string): string }} config
 * @returns {Promise<string[]>} Sorted unique absolute paths (and any literal URLs).
 */
async function expandWatchableFilePaths(config) {
  const policy = buildWatchGlobPolicy(config);
  const ignorePosix = policy.ignorePatterns.map(function(p) {
    return convertToPosix(config.resolvePath(p));
  });
  const out = [];

  for (let i = 0; i < policy.includePatterns.length; i++) {
    const pattern = policy.includePatterns[i];
    const parsed = url.parse(pattern);
    if (parsed.protocol && parsed.protocol !== 'file:' && parsed.protocol !== '') {
      out.push(pattern);
      continue;
    }
    let fsPattern = pattern;
    if (parsed.protocol === 'file:') {
      fsPattern = parsed.hostname + parsed.path;
    }
    const resolved = convertToPosix(config.resolvePath(fsPattern));
    const files = await expandGlobPattern(resolved, ignorePosix);
    out.push(...files);
  }

  return [...new Set(out)].sort();
}

module.exports = {
  buildWatchGlobPolicy,
  flattenPatternList,
  pathMatchesWatchTarget,
  expandWatchableFilePaths,
};
