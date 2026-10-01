import fs from "node:fs";
import path from "node:path";
import is_winMod from "./is-win.js";
import addToPATH from "./add-to-PATH.js";

const isWin = is_winMod();

export async function fileExists(filePath) {
  try {
    let stat = await fs.promises.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

function pathKey(env) {
  if (!isWin) {
    return 'PATH';
  }
  return Object.keys(env).find(key => key.match(/^PATH$/i)) || addToPATH.PATH;
}

function executableNames(exe) {
  if (!isWin || path.extname(exe)) {
    return [exe];
  }
  const pathext = process.env.PATHEXT || '.EXE;.CMD;.BAT;.COM';
  return [exe].concat(pathext.split(';').filter(Boolean).map(ext => exe + ext));
}

// Search PATH instead of spawning `which`/`where`.
export async function executableExists(exe, options) {
  if (path.isAbsolute(exe)) {
    return fileExists(exe);
  }

  const env = (options && options.env) || process.env;
  const delimiter = isWin ? ';' : ':';
  const dirs = String(env[pathKey(env)] || '').split(delimiter).filter(Boolean);
  const names = executableNames(exe);

  let hits = await Promise.all(dirs.map(async (dir) => {
    let found = await Promise.all(names.map(name => fileExists(path.join(dir, name))));
    return found.some(Boolean);
  }));
  return hits.some(Boolean);
}
