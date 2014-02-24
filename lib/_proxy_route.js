
var request = require('request')

proxyRoute = function(exp, host, url){

    if (host.indexOf('http://') == -1 && host.indexOf('https://') == -1)
        host = 'http://' + host;


    var resCopy = function(r, res, body){
        res.statusCode = r.statusCode;


        //res.set('Content-Type', '')

        //res.setHeader('Accept-Ranges', 'bytes')
        //res.setHeader('Cache-Control', 'public, max-age=0')


        for (h in r.headers){
            //res.set(h, r.headers[h])
            //console.log('header', h, r.headers[h])
        }


        res.set('Content-Type', r.headers['content-type'])

        if (r.headers['location'])
            res.set('Location', r.headers['location'])
        if (r.headers['set-cookie'])
            res.setHeader('Set-Cookie', r.headers['set-cookie'])
        if (r.headers['content-encoding']){
            res.setHeader('Content-Encoding', r.headers['content-encoding'])
        }
        if (r.headers['transfer-encoding']){
            res.setHeader('Transfer-Encoding', r.headers['transfer-encoding'])
            //console.log('body', body)
        }

        if (r.headers['vary']){
            res.setHeader('Vary', r.headers['vary'])
        }
        //console.log('res content-length', res.getHeader['Content-Length'])

        return res
    }

    gpipe = function(req,res){

        //console.log('get request header', req.headers)

        //req.removeHeader('Accept-Encoding')




        delete req.headers['accept-encoding']

        console.log('request headres', req.headers)

        request({url: host + req.url, headers: req.headers, timeout: 5000, followRedirect:false}, function(err, r, body){
            if (err){
                res.send({error: err.message})
            } else {
                //console.log('r.cookies', r.headers)
                //require('fs').writeFileSync(process.cwd() + '/r.txt', JSON.stringify(r))
                //console.log('code', r.statusCode)
                //console.log('gggpipe', r.headers['set-cookie']);

                resCopy(r, res, body).send(body)
            }
        })
    }




    rpipe = function(req, res){

        var resData

        //req.removeHeader('accept-encoding')

        console.log('request headres', req.headers)


        var stream = req.pipe(request({url: host + req.url, headers: req.headers, timeout: 5000}, function(err, r){

            if (err) return;

            resCopy(r, res).send(resData)
        }))

        stream.on('error', function(err){
            res.send({error: err.message})
        })

        stream.on('data', function(data){
            //console.log('data', data)
            //res.set('Content-Type', 'application/json; charset=utf-8')
            //res.statusCode = 302;
            resData = data

        })
    }

    exp.get(url, gpipe);
    exp.post(url, rpipe);
    exp.put(url, rpipe);
    exp.del(url, rpipe);
}

module.exports = proxyRoute