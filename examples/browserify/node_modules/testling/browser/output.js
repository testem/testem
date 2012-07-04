var Stream = require('stream');
var render = require('./render');
var JSONStream = require('JSONStream');

var push = JSONStream.stringify();
push.pipe(require('shoe')('/push'));

var es = require('event-stream');
var stream = module.exports = (function () {
    var s = new Stream;
    s.writable = true;
    s.readable = true;
    
    s.write = function (buf) { s.emit('data', buf) };
    
    s.end = function (buf) {
        if (buf !== undefined) s.write(buf);
        s.emit('end');
    };
    return s;
})();
stream.pipe(render);
stream.pipe(push);
