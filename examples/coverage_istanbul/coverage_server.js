var http = require('http')
var fs = require('fs')

var server = http.createServer(function(req, resp){
  req.pipe(fs.createWriteStream('coverage.json'))
  resp.end()
})

var port = 7358
server.listen(port)
console.log('Listening on', port)