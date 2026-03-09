const isWin = require('./is-win');

module.exports = {
  isPosix(path) {
    return path.includes('/') && !path.includes('\\');
  },
  convertToPosix(path) {
    if (isWin()) {
      return path.replace(/\\/g, '/');
    }
    return path;
  }
};
