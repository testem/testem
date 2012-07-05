#!/usr/bin/env node
var name = process.argv[2];

var p0 = Math.floor(Math.random() * (Math.pow(2,16) - 1e4)) + 1e4;
var p1 = Math.floor(Math.random() * (Math.pow(2,16) - 1e4)) + 1e4;

var proxy = require('./' + name)(p1);
proxy.listen(p0);

var http = require('http');
var server = http.createServer(function (req, res) {
    res.end('beepity boop');
});
server.listen(p1);

console.log('ab -n 100 -c 10 http://localhost:' + p0 + '/');
