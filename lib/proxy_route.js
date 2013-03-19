
var request = require('request')

proxyRoute = function(exp, host, url){

    if (host.indexOf('http://') == -1 && host.indexOf('https://') == -1)
        host = 'http://' + host;

    gpipe = function(req,res){

        request({url: host + req.url, timeout: 5000}, function(err, r, body){
            if (err){
                res.send({error: err.message})
            } else {
                res.set('Content-Type', r.headers['content-type'])
                res.send(body)
            }
        })
    }

    rpipe = function(req, res){
        var stream = req.pipe(request({url: host + req.url, timeout: 5000}))

        stream.on('error', function(err){
            //console.log('error', err)
            res.send({error: err.message})
        })

        stream.on('data', function(data){
            //console.log('data')
            //res.set('Content-Type', 'application/json; charset=utf-8')
            res.send(data)
        })
    }

    exp.get(url, gpipe);
    exp.post(url, rpipe);
    exp.put(url, rpipe);
    exp.del(url, rpipe);
}

module.exports = proxyRoute