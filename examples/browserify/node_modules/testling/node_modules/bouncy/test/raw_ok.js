var test = require('tap').test;
var bouncy = require('../');
var net = require('net');

test('raw with a host', function (t) {
    var port = Math.floor(Math.random() * (Math.pow(2,16) - 1e4) + 1e4);
    t.plan(2);
    var sent = false;
    
    var s = bouncy(function (req, bounce) {
        t.equal(req.headers.host, 'lulzy');
        t.ok(sent);
        req.socket.end();
        
        s.close();
    });
    
    s.listen(port, function () {
        var c = net.createConnection(port, function () {
            c.write('GET /lul HT');
            setTimeout(function () {
                c.write('TP/1.1\r\nHo');
            }, 20);
            setTimeout(function () {
                c.write('st: lulz');
            }, 40);
            setTimeout(function () {
                sent = true;
                c.write('y\r\nFoo: bar');
            }, 60);
            setTimeout(function () {
                sent = true;
                c.write('\r\n\r\n');
            }, 80);
            setTimeout(function () {
                c.end();
                t.end();
            }, 100);
        });
    });
});
