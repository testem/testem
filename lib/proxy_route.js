
var request = require('request')

var httpProxy = require('http-proxy')

var proxy = httpProxy.createProxyServer()

proxyRoute = function(exp, host, url){

    if (host.indexOf('http://') == -1 && host.indexOf('https://') == -1)
        host = 'http://' + host;

    var mw = function(req, res){
        proxy.web(req, res, { target: host }, function(err){
            res.send(502, err)
        });
    }

    proxy.on('error', function(err){
        console.log('some proxy error', err)
    })


    exp.get(url, mw);
    exp.put(url, mw);
    exp.post(url, mw);
    exp.del(url, mw);

}


module.exports = proxyRoute