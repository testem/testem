var test = require('tap').test;
var http = require('http');
var https = require('https');
var bouncy = require('../');

var fs = require('fs');
var sOpts = {
    key : fs.readFileSync(__dirname + '/https/privatekey.pem'),
    cert : fs.readFileSync(__dirname + '/https/certificate.pem')
};

test('https', function (t) {
    t.plan(5);
    
    var p0 = Math.floor(Math.random() * (Math.pow(2,16) - 1e4) + 1e4);
    var s0 = http.createServer(function (req, res) {
        res.setHeader('content-type', 'text/plain');
        res.write('beep boop');
        t.equal(req.url, '/beep');
        t.equal(req.headers['x-forwarded-proto'], 'https');
        res.end();
    });
    s0.listen(p0, connect);
    
    var p1 = Math.floor(Math.random() * (Math.pow(2,16) - 1e4) + 1e4);
    var s1 = bouncy(sOpts, function (req, bounce) {
        bounce(p0);
    });
    s1.listen(p1, connect);
    
    var connected = 0;
    function connect () {
        if (++connected !== 2) return;
        var opts = {
            host : 'localhost',
            port : p1,
            path : '/beep'
        };
        
        https.get(opts, function (res) {
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
    }
});
