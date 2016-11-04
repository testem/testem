'use strict';

var chai = require('chai');
var sinonChai = require('sinon-chai');
var chaiFiles = require('chai-files');
var chaiShallowDeepEqual = require('chai-shallow-deep-equal');
var dirtyChai = require('dirty-chai');

chai.use(sinonChai);
chai.use(chaiFiles);
chai.use(chaiShallowDeepEqual);
chai.use(dirtyChai);

var path = require('path');
var PATH = 'PATH';

// windows calls it's path 'Path' usually, but this is not guaranteed.
if (process.platform === 'win32') {
  PATH = 'Path';
  Object.keys(process.env).forEach(function(e) {
    if (e.match(/^PATH$/i)) {
      PATH = e;
    }
  });
}

var modulesPath = path.join(process.cwd(), 'node_modules', '.bin');

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

// Unset PATH set by npm running the test to ensure testem sets it correctly
process.env[PATH] = process.env[PATH].replace(new RegExp(escapeRegExp(modulesPath), 'g'), 'NOOP');
