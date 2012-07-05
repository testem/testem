var parsley = require('../');
var net = require('net');

net.createServer(function (stream) {
    parsley(stream, function (req) {
        req.on('headers', function (headers) {
            console.log(req.method + ' ' + req.url + 'HTTP/' + req.httpVersion);
            console.dir(headers);
        });
    });
}).listen(7000);
