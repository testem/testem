/*

server.js
=========

Testem's server. Serves up the HTML, JS, and CSS required for
running the tests in a browser.

*/

var Express = require('express')
  , SocketIO = require('socket.io')
  , BrowserRunner = require('../browser_runner')
  , fs = require('fs')
  , path = require('path')
  , util = require('util')
  , async = require('async')
  , glob = require('glob')
  , isa = require('../isa')
  , log = require('npmlog')
  , EventEmitter = require('events').EventEmitter
  , Backbone = require('backbone')
  , path = require('path')
  , Mustache = require('consolidate').mustache
  , http = require('http')
  //, log = new (require('log'))('info', fs.createWriteStream('testem.log2'))
        
require('./socket.io.patch')

function Server(config){
  this.config = config
  this.ieCompatMode = null
}
Server.prototype = {
  __proto__: EventEmitter.prototype
  , start: function(callback){
    callback = callback || function(){}
    this.createExpress()
    // Start the server!
    // Create socket.io sockets
    this.server = http.createServer(this.express)
    this.io = SocketIO.listen(this.server)
    this.io.sockets.on('connection', this.onClientConnected.bind(this))
    this.server.on('listening', function() {
      callback(null)
      this.emit('server-start')
    }.bind(this));
    this.server.on('error', function(e) {
      var err = new Error('Testem Server Error: ' + e.message)
      callback(err)
      this.emit('server-error', err)
    }.bind(this));
    this.server.listen(this.config.get('port'))
  }
  , stop: function(callback){
    this.server.close(callback)
  }
  , createExpress: function(){
    var self = this
    var app = this.express = Express()
        
    this.configureExpress(app)

    app.get('/', function(req, res){
      self.serveHomePage(req, res)
    })

    app.get(/\/([0-9]+)$/, function(req, res){
      self.serveHomePage(req, res)
    })

    app.get('/testem.js', function(req, res){
      self.serveTestemClientJs(req, res)
    })
        
    app.get(/^\/(?:[0-9]+)(\/.+)$/, serveStaticFile)
    app.post(/^\/(?:[0-9]+)(\/.+)$/, serveStaticFile)
    app.get(/^(.+)$/, serveStaticFile)
    app.post(/^(.+)$/, serveStaticFile)

    function serveStaticFile(req, res){
      self.serveStaticFile(req.params[0], req, res)
    }
  }
  , configureExpress: function(app){
    var self = this

    app.configure(function(){
      app.engine('mustache', Mustache)
      app.set("view options", {layout: false})
      app.use(Express.bodyParser())
      app.use(function(req, res, next){
        if (self.ieCompatMode)
          res.setHeader('X-UA-Compatible', 'IE=' + self.ieCompatMode)
        next()
      })
      app.use(Express.static(__dirname + '/../../public'))
    })
  }
  , renderRunnerPage: function(err, files, res){
    var config = this.config
    var framework = config.get('framework') || 'jasmine'
    var css_files = config.get('css_files')
    var templateFile = { 
      jasmine: 'jasminerunner'
      , jasmine2: 'jasmine2runner'
      , qunit: 'qunitrunner'
      , mocha: 'mocharunner'
      , 'mocha+chai': 'mochachairunner'
      , buster: 'busterrunner'
      , custom: 'customrunner'
      , tap: 'taprunner'
    }[framework] + '.mustache'
    res.render(__dirname + '/../../views/' + templateFile, {    
      scripts: files,
      styles: css_files
    })
  }
  , renderDefaultTestPage: function(req, res){
    res.header('Cache-Control', 'No-cache')
    res.header('Pragma', 'No-cache')


    var self = this
    var config = this.config
    var test_page = config.get('test_page')
          
    if (test_page){
      if (test_page[0] === "/") {
        test_page = encodeURIComponent(test_page)
      }
      var base = req.path === '/' ? 
        req.path : req.path + '/'
      var url = base + test_page
      res.redirect(url)
    } else {
      config.getServeFiles(function(err, files){
        self.renderRunnerPage(err, files, res)
      })
    }
  }
  , serveHomePage: function(req, res){
    var config = this.config
    var routes = config.get('routes') || config.get('route') || {}
    if (routes['/']){
      this.serveStaticFile('/', req, res)
    }else{
      this.renderDefaultTestPage(req, res)
    }
  }
  , serveTestemClientJs: function(req, res){
    res.setHeader('Content-Type', 'text/javascript')

    res.write(';(function(){')
    var files = [
      'socket.io.js'
      , 'json2.js'
      , 'jasmine_adapter.js'
      , 'jasmine2_adapter.js'
      , 'qunit_adapter.js'
      , 'mocha_adapter.js'
      , 'buster_adapter.js'
      , 'testem_client.js'
    ]
    async.forEachSeries(files, function(file, done){
      file = __dirname + '/../../public/testem/' + file
      fs.readFile(file, function(err, data){
        if (err){
          res.write('// Error reading ' + file + ': ' + err)
        }else{
          res.write('\n//============== ' + path.basename(file) + ' ==================\n\n')
          res.write(data)
        }
        done()
      })
    }, function(){
      res.write('}());')
      res.end()
    })
        
  }
  , killTheCache: function killTheCache(req, res){
    res.setHeader('Cache-Control', 'No-cache')
    res.setHeader('Pragma', 'No-cache')
    delete req.headers['if-modified-since']
    delete req.headers['if-none-match']
  }
  , route: function route(uri){
    var config = this.config
    var routes = config.get('routes') || config.get('route') || {}
    var bestMatchLength = 0
    var bestMatch = null
    for (var prefix in routes){
      if (uri.substring(0, prefix.length) === prefix){
        if (bestMatchLength < prefix.length){
          bestMatch = routes[prefix] + '/' + uri.substring(prefix.length)
          bestMatchLength = prefix.length
        }
      }
    }
    return {
      routed: !!bestMatch
      , uri: bestMatch || uri.substring(1)
    }
  }
  , serveStaticFile: function(uri, req, res){
    var self = this
    var config = this.config
    var routeRes = this.route(uri)
    uri = routeRes.uri
    var wasRouted = routeRes.routed
    this.killTheCache(req, res)
    var allowUnsafeDirs = config.get('unsafe_file_serving')
    var filePath = path.resolve(config.resolvePath(uri))
    var ext = path.extname(filePath)
    var isPathPermitted = filePath.indexOf(config.cwd()) !== -1
    if (!wasRouted && !allowUnsafeDirs && !isPathPermitted) {
      res.status(403)
      res.write('403 Forbidden')
      res.end()
    } else if (ext === '.mustache') {
      config.getTemplateData(function(err, data){
        res.render(filePath, data)
        self.emit('file-requested', filePath)
      })
    } else {
      fs.stat(filePath, function(err, stat){
        self.emit('file-requested', filePath)
        if (err) return res.sendfile(filePath)    
        if (stat.isDirectory()){
          fs.readdir(filePath, function(err, files){
            var dirListingPage = __dirname + '/../../views/directorylisting.mustache'
            res.render(dirListingPage, {files: files})
          })
        }else{
          res.sendfile(filePath)
        }
      })   
    }
  }
  , onClientConnected: function(client){
    var self = this
    client.once('browser-login', function(browserName, id){
      log.info('New client connected: ' + browserName + ' ' + id)
      self.emit('browser-login', browserName, id, client)
    })
  }
}

module.exports = Server
