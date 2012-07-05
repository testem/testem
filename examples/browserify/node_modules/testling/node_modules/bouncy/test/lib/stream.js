var net = require('net');
module.exports = function () {
    var s = new net.Stream;
    s.readable = true;
    s.writable = true;
    s.write = function (buf) { s.emit('data', buf) };
    s.end = function () { s.emit('end') };
    return s;
};
