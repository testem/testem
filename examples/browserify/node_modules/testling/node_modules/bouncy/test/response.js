var test = require('tap').test;
var http = require('http');
var bouncy = require('../');

test('response', function (t) {
    t.plan(4);
    
    var port = Math.floor(Math.random() * 5e4 + 1e4);
    var server = bouncy(function (req, bounce) {
        t.equal(req.url, '/beep');
        
        var res = bounce.respond();
        res.setHeader('content-type', 'text/plain');
        res.end('beep boop');
    });
    
    server.listen(port, function () {
        var opts = {
            method : 'GET',
            host : 'localhost',
            port : port,
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
                server.close();
                t.end();
            });
        });
        req.end();
    });
});
