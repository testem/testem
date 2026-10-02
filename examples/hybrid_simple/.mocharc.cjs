'use strict';

// Mocha 12.0.2+ looks for `.mocharc.cjs` all the way up the tree before it
// considers `.mocharc.js` in this directory. This file stops that walk so the
// repository-root config (which loads tests/_prepare.js) is not applied here.
module.exports = {};
