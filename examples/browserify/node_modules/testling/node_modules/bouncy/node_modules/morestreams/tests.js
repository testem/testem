var streams = require('./main')
  , assert = require('assert')
  , stream = require('stream')
  ;
  
var source = new stream.Stream()
  , dest = new stream.Stream()
  , buffered = new streams.BufferedStream()
  ;

source.readable = true
dest.writable = true

source.pause = function () {
  throw new Error("Pause should not be called")
}
source.pipe(buffered)
var i = 0;

while (i !== 100) {
  source.emit("data", "asdf")
  i++
}

assert.ok(buffered.chunks.length === 100);

i = 0;
dest.write = function () {
  i++
}

buffered.pipe(dest)

assert.ok(i === 100);

