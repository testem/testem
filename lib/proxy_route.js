
var request = require('request')

var http = require('http'), https= require('https')

proxyRoute = function(exp, host, url, methods){

    methods = methods || 'get put post del'

    method = function(m) {return methods.indexOf(m) >= 0}

    if (host.indexOf('http://') == -1 && host.indexOf('https://') == -1)
        host = 'http://' + host;

    if (method('get'))
        exp.get(url, function(req,res){

            request({url: host + req.url, followRedirect: false, timeout: 5000}, function(e, r, body){
            }).pipe(res)

        });

    rpipe = function(req,res){
        req.pipe(request({url: host + req.url, timeout: 5000})).pipe(res)
    }

    //if (method('get')) exp.get(url, rpipe);
    if (method('post')) exp.post(url, rpipe);
    if (method('put'))  exp.put(url, rpipe);
    if (method('del')) exp.del(url, rpipe);
}

module.exports = proxyRoute