var net = require('net');
var http = require('http');
var server = new http.Server;

server.on('request', function (req, res) {
    res.end('pow\r\n');
});

net.createServer(function (stream) {
    http._connectionListener.call(server, stream);
}).listen(7000);

console.log('ab -n 1000 -c 10 http://localhost:7000/');
