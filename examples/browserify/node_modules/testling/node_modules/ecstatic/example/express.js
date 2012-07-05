var express = require('express');
var ecstatic = require('../lib/ecstatic');

var app = express.createServer();
app.use(ecstatic(__dirname + '/public', { showdir : true }));
app.listen(8080);

console.log('Listening on :8080');
