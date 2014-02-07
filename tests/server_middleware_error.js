var Server = require('../lib/server')
var Config = require('../lib/config')
var EventEmitter = require('events').EventEmitter
var Backbone = require('backbone')
var request = require('request')
var jsdom = require('jsdom')
var fs = require('fs')
var path = require('path')
var expect = require('chai').expect

describe('Server', function(){
  var server, runners, app, socketClient, config
  var orgSetTimeout, baseUrl, port
  before(function(done){
  port = 73571
  config = new Config('dev', {
    port: port,
    src_files: [
      'web/hello.js',
      {src:'web/hello_tst.js', attrs: ['data-foo="true"', 'data-bar']}
    ],
    cwd: 'tests',
    middlewares: [function(err, req, res, next){
      if (err.code === "ENOENT" && err.path.match(/missing$/)) {
        res.send('hijacking errors')
      } else {
        next(err)
      }
    }]
  })
  baseUrl = 'http://localhost:' + port + '/'
  runners = new Backbone.Collection

  server = new Server(config)
  server.start()
  server.server.addListener('connection', function(stream){
    stream.setTimeout(100) // don't tolerate idleness in tests
  })
  server.once('server-start', function(){
    done()
  })
  socketClient = new EventEmitter
  })
  after(function(done){
    server.stop(function(){
      done()
    })
  })

  it('handles errors', function(done){
    request(baseUrl + 'im/sure/the_path/is/missing', function(err, req, text){
      expect(req.statusCode).to.equal(200)
      expect(text).to.match(/hijacking errors/)
      done()
    })
  })

})
