module.exports = function readStream(stream) {
  return stream.read().toString();
};
