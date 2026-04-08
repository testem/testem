const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

/**
 * Walks upward from `startDir` looking for `node_modules/testem/testem.js`.
 *
 * @param {string} startDir
 * @returns {string | null}
 */
function findLocalTestemScript(startDir) {
  let dir = path.resolve(startDir);
  const { root } = path.parse(dir);
  while (true) {
    const candidate = path.join(dir, 'node_modules', 'testem', 'testem.js');
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    if (dir === root) {
      break;
    }
    dir = path.dirname(dir);
  }
  return null;
}

/**
 * If a local install exists and is not the same file as the running CLI (e.g. global),
 * returns the path to the local `testem.js`. Otherwise returns null.
 *
 * @param {string} currentFile - `__filename` of the running CLI
 * @param {string} cwd
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string | null}
 */
function resolveLocalTestemCliOrNull(currentFile, cwd, env = process.env) {
  if (env.TESTEM_USE_GLOBAL === '1') {
    return null;
  }
  const local = findLocalTestemScript(cwd);
  if (!local) {
    return null;
  }
  let cur;
  let loc;
  try {
    cur = fs.realpathSync(currentFile);
    loc = fs.realpathSync(local);
  } catch {
    return null;
  }
  if (cur === loc) {
    return null;
  }
  return local;
}

/**
 * When the globally installed `testem` is run inside a project that has a local
 * `testem` dependency, re-exec that local copy so CLI and project stay in sync.
 *
 * Exits the process when delegation runs; otherwise returns normally.
 *
 * @param {string} currentFile
 * @param {string[]} argv
 * @param {string} cwd
 * @param {NodeJS.ProcessEnv} env
 */
function tryDelegateToLocalTestem(currentFile, argv, cwd, env) {
  const local = resolveLocalTestemCliOrNull(currentFile, cwd, env);
  if (!local) {
    return;
  }
  const result = spawnSync(process.execPath, [local, ...argv.slice(2)], {
    stdio: 'inherit',
    env,
    windowsHide: true,
  });
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  if (result.signal) {
    process.exit(1);
  }
  process.exit(result.status === null ? 0 : result.status);
}

module.exports = {
  findLocalTestemScript,
  resolveLocalTestemCliOrNull,
  tryDelegateToLocalTestem,
};
