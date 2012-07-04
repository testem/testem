var test = require('tap').test;
var bouncy = require('../');
var net = require('net');

test('raw without a host', function (t) {
    t.plan(1);
    
    var port = Math.floor(Math.random() * (Math.pow(2,16) - 1e4) + 1e4);
    var s = bouncy(function (req, bounce) {
        t.strictEqual(req.headers.host, undefined);
        t.end();
        req.socket.end();
        s.close();
    });
    
    s.listen(port, function () {
        var c = net.createConnection(port, function () {
            c.write('GET /lul HTTP/1.0\r\n\r\n');
        });
    });
});
