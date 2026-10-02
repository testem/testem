import is_winMod from "./is-win.js";

const isWin = is_winMod();
let PATH = 'PATH';
let delimiter = ':';

// windows calls it's path 'Path' usually, but this is not guaranteed.
if (isWin) {
  PATH = 'Path';
  delimiter = ';';
  Object.keys(process.env).forEach(function(e) {
    if (e.match(/^PATH$/i)) {
      PATH = e;
    }
  });
}

export default function addToPATH(path) {
  let env = Object.assign({}, process.env);
  env[PATH] = [path, env[PATH]].join(delimiter);

  return env;
}
addToPATH.PATH = PATH;