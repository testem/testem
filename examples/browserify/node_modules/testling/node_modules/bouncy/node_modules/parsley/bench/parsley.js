var parsley = require('../');
var ServerResponse = require('http').ServerResponse;
var net = require('net');

net.createServer(function (stream) {
    parsley(stream, function (req) {
        var res = new ServerResponse(req);
        res.assignSocket(stream);
        
        req.on('headers', function (headers) {
            res.end('pow\r\n');
            stream.end();
        });
    });
}).listen(7000);

console.log('ab -n 5000 -c 10 http://localhost:7000/');
