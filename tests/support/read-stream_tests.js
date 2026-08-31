const assert = require('chai').assert;
const PassThrough = require('stream').PassThrough;
const readStream = require('./read-stream');

describe('readStream', function() {
  it('returns all writes concatenated', function() {
    const stream = new PassThrough();
    stream.write('abc');
    stream.write('d');
    stream.write('ef');
    assert.strictEqual(readStream(stream), 'abcdef');
  });
});
