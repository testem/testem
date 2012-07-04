var http = require('http');
var ecstatic = require('../lib/ecstatic')(__dirname + '/public');

http.createServer(ecstatic).listen(8080);

console.log('Listening on :8080');
