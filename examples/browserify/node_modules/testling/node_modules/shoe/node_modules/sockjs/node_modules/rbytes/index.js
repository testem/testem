var binding = require('./build/default/binding');

Buffer.prototype.toHex = function() {
  return binding.bufToHex(this);
};

Buffer.prototype.writeHex = function(hex) {
  return binding.hexToBuf(hex, this);
};

exports.randomBytes = function(len) {
  var b = new Buffer(len);
  binding.randomBytes(b);
  return b;
};