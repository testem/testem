// bounce requests to :8001 along to :8000

var bouncy = require('bouncy');
var net = require('net');

bouncy(function (req, bounce) {
    var stream = net.createConnection(8000);
    bounce(stream);
}).listen(8001);
