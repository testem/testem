const os = require('os');
const path = require('path');
const { randomBytes } = require('crypto');

// Returns a unique temp file path without creating anything on disk,
// matching the behaviour of the former tmp.tmpName() calls.
const tmpNameAsync = () => Promise.resolve(path.join(os.tmpdir(), randomBytes(16).toString('hex')));

module.exports = { tmpNameAsync };
