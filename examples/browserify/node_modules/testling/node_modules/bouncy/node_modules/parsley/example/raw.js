var parsley = require('../');
var net = require('net');

net.createServer(function (stream) {
    parsley(stream, function (req) {
        var head = [];
        req.on('rawHead', function (buf) {
            head.push(buf);
        });
        
        var body = [];
        req.on('rawBody', function (buf) {
            body.push(buf);
        });
        
        req.on('end', function () {
            console.dir(head.map(String));
            console.dir(body.map(String));
        });
    });
}).listen(7000);
