// Node 26 `read()` returns one chunk; `read(readableLength)` returns the full buffer.
module.exports = function readStream(stream) {
  return stream.read(stream.readableLength).toString();
};
