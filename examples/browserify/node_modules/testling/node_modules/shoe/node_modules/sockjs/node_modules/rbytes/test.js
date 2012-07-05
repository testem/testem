var assert = require('assert');
var log    = console.log;
var rbytes = require('./index');
var buf;
var octets = [0xa8, 0x75, 0xfe, 0xae, 0xc6, 0x7f, 0x00, 0x00, 0xa8, 0x75];

log("random bytes");
buf = rbytes.randomBytes(12);
assert.ok(Buffer.isBuffer(buf));
assert.equal(buf.length, 12);

log("buffer to hex");
buf = Buffer(octets);
assert.equal(buf.toHex(), "a875feaec67f0000a875");

log("write hex to buffer");
buf = Buffer(10);
assert.equal(buf.writeHex("a875feaec67f0000a875"), 10);
assert.equal(buf.length, 10);
for (var i=0; i<10; i++) {
  assert.equal(buf[i], octets[i]);
}

log("add leading 0");
buf = Buffer(1)
assert.equal(buf.writeHex("f"), 1);
assert.equal(buf.toHex(), "0f");

log("too small");
buf = Buffer(1);
assert.throws(function() { buf.writeHex("ffff") },
  Error, "Buffer too small");

buf = Buffer(10);
assert.throws(function() { buf.writeHex("a875feaec67f0000a8751") },
  Error, "Buffer too small");

log("invalid hex");
buf = Buffer(10);
assert.throws(function() { buf.writeHex("gfhf") },
  TypeError, "Invalid hex string");

buf = Buffer(1);
assert.throws(function() { buf.writeHex("g") },
  TypeError, "Invalid hex string");