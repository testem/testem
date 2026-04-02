

var test = require('fresh-tape');
var hello = require('./hello');

test('hello says hello', function(t) {
  t.plan(1);
  t.equal(hello(), 'hello world', 'hello() should be "hello world"');
});

test('hello says hello to bob', function(t) {
  t.plan(1);
  t.equal(hello('bob'), 'hello bob', 'hello(bob) should be "hello bob"');
});

test('Buffer.from encodes and decodes UTF-8', function(t) {
  t.plan(1);
  t.equal(Buffer.from('hi').toString(), 'hi', 'Buffer string round-trip');
});

test('process exposes expected globals', function(t) {
  t.plan(1);
  t.ok(
    typeof process === 'object' && typeof process.nextTick === 'function',
    'process and process.nextTick are available'
  );
});
