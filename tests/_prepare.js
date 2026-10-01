import * as chai from "chai";
import sinonChai from "sinon-chai";
import dirtyChai from "dirty-chai";
import path from "node:path";

chai.use(sinonChai);
chai.use(dirtyChai);

let PATH = 'PATH';

// windows calls it's path 'Path' usually, but this is not guaranteed.
if (process.platform === 'win32') {
  PATH = 'Path';
  Object.keys(process.env).forEach(function (e) {
    if (e.match(/^PATH$/i)) {
      PATH = e;
    }
  });
}

const modulesPath = path.join(process.cwd(), 'node_modules', '.bin');

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

// Unset PATH set by npm running the test to ensure testem sets it correctly
process.env[PATH] = process.env[PATH].replace(
  new RegExp(escapeRegExp(modulesPath), 'g'),
  'NOOP',
);
