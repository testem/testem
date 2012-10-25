/*

server.js
=========

Testem's server. Serves up the HTML, JS, and CSS required for
running the tests in a browser.

*/

var Express = require('express')
  , SocketIO = require('socket.io')
  , BrowserRunner = require('./runners').BrowserRunner
  , Mustache = require('./mustache.exp')
  , fs = require('fs')
  , path = require('path')
  , util = require('util')
  , async = require('async')
  , glob = require('glob')
  , isa = require('./isa')
  , log = require('winston')
  , EventEmitter = require('events').EventEmitter
  , Backbone = require('backbone')
  , path = require('path')
  //, log = new (require('log'))('info', fs.createWriteStream('testem.log2'))
        
require('./socket.io.patch')

function Server(app){
    this.app = app
    
    // Build the server
    this.exp = Express.createServer()
    this.initServer()
    this.ieCompatMode = null
}
Server.prototype = {
    __proto__: EventEmitter.prototype
    , start: function(){
        // Start the server!
        this.exp.listen(this.app.config.get('port'))
        process.nextTick(function(){
            this.emit('server-start')
        }.bind(this))
    }
    , initServer: function(){
        var self = this
          , config = this.app.config
          , exp = this.exp
        exp.configure(function(){
            exp.register(".html", Mustache)
            exp.set("view options", {layout: false})
            exp.use(function(req, res, next){
                if (self.ieCompatMode)
                    res.setHeader('X-UA-Compatible', 'IE=' + self.ieCompatMode)
                next()
            })
            exp.use(Express.static(__dirname + '/../public'))
        })
        exp.get('/', function(req, res){
            var framework = config.get('framework') || 'jasmine'
              , test_page = config.get('test_page')
              , serve_files = config.get('serve_files') || config.get('src_files')
              , css_files = config.get('css_files')

            res.header('Cache-Control', 'No-cache')
            res.header('Pragma', 'No-cache')
            function render(err, files){
                var runnerPage = { 
                    jasmine: __dirname + '/../views/jasminerunner.html'
                    , qunit: __dirname + '/../views/qunitrunner.html'
                    , mocha: __dirname + '/../views/mocharunner.html'
                    , custom: __dirname + '/../views/customrunner.html'
                }[framework]
                res.render(runnerPage, {
                    locals: {
                      scripts: files,
                      styles: css_files
                    }
                })
            }

            if (test_page){
                var url = '/' + test_page
                res.redirect(url + '#testem')
            }else if (isa(serve_files, Array)){
                // TODO: dedup
                async.reduce(serve_files, [], function(curr, pattern, next){
                    glob(pattern, function(err, files){
                        if (err) next(null, curr)
                        else next(null, curr.concat(files))
                    })
                }, render)
            }else{
                fs.readdir(process.cwd(), function(err, files){
                    files = files.filter(function(file){
                        return !!file.match(/\.js$/)
                    })
                    render(err, files)
                })
            }
        })

        exp.get('/testem.js', function(req, res){

            res.setHeader('Content-Type', 'text/javascript')
            

            res.write(';(function(){')
            var files = [
                __dirname + '/../public/testem/socket.io.js'
                , __dirname + '/../public/testem/jasmine_adapter.js'
                , __dirname + '/../public/testem/qunit_adapter.js'
                , __dirname + '/../public/testem/mocha_adapter.js'
                , __dirname + '/../public/testem/testem_client.js'
            ]
            async.forEachSeries(files, function(file, done){
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
            
        })

        function killTheCache(req, res){
            res.setHeader('Cache-Control', 'No-cache')
            res.setHeader('Pragma', 'No-cache')
            delete req.headers['if-modified-since']
            delete req.headers['if-none-match']
        }

        function route(uri){
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
            return bestMatch || uri.substring(1) // get rid of leading slash
        }

        // serve a static file from FS
        function serveStaticFile(req, res){
            killTheCache(req, res)
            var allowUnsafeDirs = config.get('unsafe_file_serving')
            var uri = req.params[0]
            var uri = route(uri)
            var filePath = path.resolve(process.cwd(), uri)
            var isPathPermitted = filePath.indexOf(process.cwd()) !== -1
            if (!allowUnsafeDirs && !isPathPermitted) {
                res.status(403)
                res.write('403 Forbidden')
                res.end()
            } else {
                self.emit('file-requested', filePath)
                res.sendfile(filePath)
            }
        }
        // Everything falls back to serving a static file from the FS
        exp.get(/^(.+)$/, serveStaticFile)

        // Create socket.io sockets
        this.io = SocketIO.listen(this.exp)

        this.io.sockets.on('connection', this.onClientConnected.bind(this))
        
    }
    , onClientConnected: function(client){
        var app = this.app
        client.once('browser-login', function(browserName){
            log.info('New client connected: ' + browserName)
            app.connectBrowser(browserName, client)
        })
    }
    , removeBrowser: function(browser){
        this.app.removeBrowser(browser)
    }
}

module.exports = Server
