var express = require('express')
var app = express()

app.use(express.bodyParser())

app.get('/', function(req, resp){
    resp.sendfile('index.html')
})

app.get('/jquery.js', function(req, resp){
    resp.sendfile('jquery.js')
})

app.get('/api', function(req, resp){
    var num = Math.round(Math.random() * 10)
    console.log('GET /api ' + num)
    resp.end(String(num))
})

app.post('/api', function(req, resp){
    var num = req.body['num']
    console.log('POST /api ' + num)
    resp.end('')
})

app.listen(7357)