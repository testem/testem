
var request = require('request')

var http = require('http'), https= require('https')

proxyRoute = function(exp, host, url, methods){

    methods = methods || 'get put post del'

    method = function(m) {return methods.indexOf(m) >= 0}

    if (host.indexOf('http://') == -1 && host.indexOf('https://') == -1)
        host = 'http://' + host;

//    if (method('get'))
//        exp.get(url, function(req,res){
//
//            request({url: host + req.url, followRedirect: false, timeout: 5000}, function(e, r, body){
//            }).pipe(res)
//
//        });

    rpipe = function(req,res){
        //req.pipe(request({url: host + req.url, timeout: 5000})).pipe(res)
        //var r =

//        request({method: req.method, body: req.body, url: host + req.url, timeout: 5000}, function(err, r, body){
//            if (err){
//                res.send({error: err.message})
//            } else {
//                //res.set('Content-Type', 'application/json; charset=utf-8')
//                res.set('Content-Type', r.headers['content-type'])
//                res.send(body)
//            }
//        })

        var stream = req.pipe(request({url: host + req.url, timeout: 5000},
            function(err, response, body){
                console.log('request callback')
                res.set('Content-type', 'application/json; charset=utf-8')
                res.send(body)
            }))

        stream.on('error', function(err){
            console.log('error', err)
            res.send({error: err.message})
        })


        stream.on('data', function(data){
            //console.log('data')

            //data = d





            //r.pipe(res)
        })

        stream.on('end', function(err){
            //console.log('end')
            //stream.pipe(res)
        })
        return
//
//        request({method: req.method, followRedirect: false, url: host + req.url, timeout: 5000}, function(err, r, body){
//            //console.log({})
//            if (err){
//                res.send({error: err})
//            } else {
//                //res.send(body)
//                r.pipe(res)
//            }
//
//            //pipe(res)
//        })

    }

    if (method('get')) exp.get(url, rpipe);
    if (method('post')) exp.post(url, rpipe);
    if (method('put'))  exp.put(url, rpipe);
    if (method('del')) exp.del(url, rpipe);
}

module.exports = proxyRoute