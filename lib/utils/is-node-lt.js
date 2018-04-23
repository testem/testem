'use strict';

module.exports = version => {
  var nodeVer = process.version.substr(1).split('.').map(num => parseInt(num, 10));
  return (nodeVer[0] < version);
};
