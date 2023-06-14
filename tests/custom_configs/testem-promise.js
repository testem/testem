'use strict';

module.exports = function() {
  return new Promise(resolve => {
    resolve({
      framework: 'qunit',
    });
  });
};
