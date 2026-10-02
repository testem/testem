import isWin from "./is-win.js";

export function isPosix(path) {
    return path.includes('/') && !path.includes('\\');
  }
export function convertToPosix(path) {
    if (isWin()) {
      return path.replace(/\\/g, '/');
    }
    return path;
  }