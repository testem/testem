var http = require('http');
var ecstatic = require('ecstatic')(__dirname + '/static');
var qs = require('querystring');
var fs = require('fs');

var formDir = __dirname + '/static/test-form';

http.createServer(function (req, res) {
    if (req.method === 'POST') {
        var data = '';
        req.on('data', function (buf) { data += buf });
        
        req.on('end', function () {
            res.setHeader('content-type', 'text/html');
            var params = qs.parse(data);
console.log('POST ' + JSON.stringify(params)); 
            if (params.login === 'testling' && params.passw === 'qwerty') {
                fs.createReadStream(formDir + '/success.html').pipe(res);
            }
            else fs.createReadStream(formDir + '/failure.html').pipe(res)
        });
    }
    else ecstatic(req, res)
}).listen(7272);
