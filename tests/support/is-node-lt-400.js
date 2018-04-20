'use strict';

var isNodeLt = require('../../lib/utils/is-node-lt');

module.exports = function() {
  return isNodeLt(4);
};
