var test = require('tap').test;
var bouncy = require('../');
var net = require('net');

test('parse error', function (t) {
    var port = Math.floor(Math.random() * (Math.pow(2,16) - 1e4) + 1e4);
    t.plan(1);
    var sent = false;
    
    var s = bouncy(function (req, bounce) {
        req.on('error', function (err) {
            t.ok(err.message, 'error parsing method');
            req.socket.end();
            s.close();
            t.end();
        });
    });
    
    s.listen(port, function () {
        var c = net.createConnection(port, function () {
            c.write([
                'rawr\r\n'
            ].join('\r\n'));
        });
    });
});
