import { assert } from "chai";
import { PassThrough } from "node:stream";
import readStream from "./read-stream.js";

describe('readStream', function() {
  it('returns all writes concatenated', function() {
    const stream = new PassThrough();
    stream.write('abc');
    stream.write('d');
    stream.write('ef');
    assert.strictEqual(readStream(stream), 'abcdef');
  });
});
