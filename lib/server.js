/*

server.js
=========

Testem's server. Serves up the HTML, JS, and CSS required for
running the tests in a browser.

*/

var Express = require('express')
  , SocketIO = require('socket.io')
  //, BrowserRunner = require('./runners').BrowserRunner
  , fs = require('fs')
  , path = require('path')
  , util = require('util')
  , async = require('async')
  , glob = require('glob')
  //, isa = require('./isa')
  , log = require('winston')
  , EventEmitter = require('events').EventEmitter
  , Backbone = require('backbone')
  , Mustache = require('consolidate').mustache
  , http = require('http')
  , proxyRoute = require('./proxy_route')

  //, log = new (require('log'))('info', fs.createWriteStream('testem.log2'))
        
require('./socket.io.patch')

function Server(app){
    this.app = app
    this.config = this.app.config
    this.createExpress()
    this.ieCompatMode = null
}
Server.prototype = {
    __proto__: EventEmitter.prototype
    , start: function(){
        // Start the server!
        // Create socket.io sockets
        this.server = http.createServer(this.express)
        this.io = SocketIO.listen(this.server)
        this.io.sockets.on('connection', this.onClientConnected.bind(this))
        this.server.listen(this.config.get('port'))
        process.nextTick(function(){
            this.emit('server-start')
        }.bind(this))
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

        app.get('/testem.js', function(req, res){
            self.serveTestemClientJs(req, res)
        })

        /*whitecolor */
        // Setup proxy routes
        var routes = this.config.get('proxy_routes')
        for (var route in routes){
            proxyRoute(app, routes[route], route)
        }
        /*whitecolor */


        // Everything falls back to serving a static file from the FS
        app.get(/^(.+)$/, function(req, res){
            self.serveStaticFile(req.params[0], req, res)
        })
    }
    , configureExpress: function(app){
        var self = this

        app.configure(function(){
            app.engine("html", Mustache)
            app.set("view options", {layout: false})
            app.use(function(req, res, next){
                if (self.ieCompatMode)
                    res.setHeader('X-UA-Compatible', 'IE=' + self.ieCompatMode)
                next()
            })
            app.use(Express.static(__dirname + '/../public'))
        })
    }
    , renderRunnerPage: function(err, files, res){
        var config = this.config
        var framework = config.get('framework') || 'jasmine'
        var css_files = config.get('css_files')
        var templateFile = { 
            jasmine: 'jasminerunner.html'
            , qunit: 'qunitrunner.html'
            , mocha: 'mocharunner.html'
            , 'mocha+chai': 'mochachairunner.html'
            , buster: 'busterrunner.html'
            , custom: 'customrunner.html'
        }[framework]
        res.render(__dirname + '/../views/' + templateFile, {    
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
            var url = '/' + test_page
            res.redirect(url + '#testem')
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
            /*whitecolor */
            //, 'jasmine_adapter.js'
            //, 'qunit_adapter.js'
            //, 'mocha_adapter.js'
            //, 'buster_adapter.js'
            /*whitecolor */
            , 'testem_client.js'
        ]
        async.forEachSeries(files, function(file, done){
            file = __dirname + '/../public/testem/' + file
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
        } else if (ext === '.html') {
            config.getTemplateData(function(err, data){
                res.render(filePath, data)
                self.emit('file-requested', filePath)
            })
        } else {
            fs.stat(filePath, function(err, stat){
                self.emit('file-requested', filePath)
                if (err) return res.sendfile(filePath)    
                if (stat.isDirectory()){
                /*whitecolor */
//                    fs.readdir(filePath, function(err, files){
//                        var dirListingPage = __dirname + '/../views/directorylisting.html'
//                        res.render(dirListingPage, {files: files})
//                    })
                    self.emit('file-requested', filePath + '/index.html')
                    res.sendfile(filePath + '/index.html')
                    /*whitecolor */
                }else {
                    res.sendfile(filePath)
                }
            })
            
        }
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
