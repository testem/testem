var test = require('tap').test;
var http = require('http');
var net = require('net');
var bouncy = require('../');

test('bounce', function (t) {
    var p0 = Math.floor(Math.random() * (Math.pow(2,16) - 1e4) + 1e4);
    var s0 = http.createServer(function (req, res) {
        res.setHeader('content-type', 'text/plain');
        res.write('beep boop');
        res.end();
    });
    s0.listen(p0, connect);
    
    var p1 = Math.floor(Math.random() * (Math.pow(2,16) - 1e4) + 1e4);
    var s1 = bouncy(function (req, bounce) {
        var stream = net.createConnection(p0);
        bounce(stream);
    });
    s1.listen(p1, connect);
    
    var connected = 0;
    function connect () {
        if (++connected !== 2) return;
        var opts = {
            method : 'GET',
            host : 'localhost',
            port : p1,
            path : '/beep'
        };
        var req = http.request(opts, function (res) {
            t.equal(res.statusCode, 200)
            t.equal(res.headers['content-type'], 'text/plain');
            
            var data = '';
            res.on('data', function (buf) {
                data += buf.toString();
            });
            
            res.on('end', function () {
                t.equal(data, 'beep boop');
                s0.close();
                s1.close();
                t.end();
            });
        });
        req.end();
    }
});
