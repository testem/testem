/*

server.js
=========

Testem's server. Serves up the HTML, JS, and CSS required for
running the tests in a browser.

*/

var Express = require('express')
  , SocketIO = require('socket.io')
  , BrowserRunner = require('./runners').BrowserRunner
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
  , Mustache = require('consolidate').mustache
  , http = require('http')
  //, log = new (require('log'))('info', fs.createWriteStream('testem.log2'))
        
require('./socket.io.patch')

function Server(app){
    this.app = app
    
    // Build the server
    this.exp = Express()
    this.initServer()
    this.ieCompatMode = null
}
Server.prototype = {
    __proto__: EventEmitter.prototype
    , start: function(){
        // Start the server!
        // Create socket.io sockets
        this.server = http.createServer(this.exp)
        this.io = SocketIO.listen(this.server)
        this.io.sockets.on('connection', this.onClientConnected.bind(this))
        this.server.listen(this.app.config.get('port'))
        process.nextTick(function(){
            this.emit('server-start')
        }.bind(this))
    }
    , stop: function(callback){
        this.server.close(callback)
    }
    , configure: function(){
        var self = this
        var exp = this.exp
        exp.configure(function(){
            exp.engine("html", Mustache)
            exp.set("view options", {layout: false})
            exp.use(function(req, res, next){
                if (self.ieCompatMode)
                    res.setHeader('X-UA-Compatible', 'IE=' + self.ieCompatMode)
                next()
            })
            exp.use(Express.static(__dirname + '/../public'))
        })
    }
    , initServer: function(){
        var self = this
        var config = this.app.config
        var exp = this.exp

        this.configure()

        exp.get('/', function(req, res){
            self.serveHomePage(req, res)
        })

        exp.get('/testem.js', function(req, res){
            self.serveTestemClientJs(req, res)
        })
        
        // Everything falls back to serving a static file from the FS
        exp.get(/^(.+)$/, function(req, res){
            self.serveStaticFile(req.params[0], req, res)
        })
        
    }
    , renderRunnerPage: function(err, files, res){
        var config = this.app.config
        var framework = config.get('framework') || 'jasmine'
        var css_files = config.get('css_files')
        var runnerPage = { 
            jasmine: __dirname + '/../views/jasminerunner.html'
            , qunit: __dirname + '/../views/qunitrunner.html'
            , mocha: __dirname + '/../views/mocharunner.html'
            , 'mocha+chai': __dirname + '/../views/mochachairunner.html'
            , buster: __dirname + '/../views/busterrunner.html'
            , custom: __dirname + '/../views/customrunner.html'
        }[framework]
        res.render(runnerPage, {    
            scripts: files,
            styles: css_files
        })
    }
    , renderDefaultTestPage: function(req, res){
        res.header('Cache-Control', 'No-cache')
        res.header('Pragma', 'No-cache')


        var self = this
        var config = this.app.config
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
        var config = this.app.config
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
            __dirname + '/../public/testem/socket.io.js'
            , __dirname + '/../public/testem/jasmine_adapter.js'
            , __dirname + '/../public/testem/qunit_adapter.js'
            , __dirname + '/../public/testem/mocha_adapter.js'
            , __dirname + '/../public/testem/buster_adapter.js'
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
        
    }
    , killTheCache: function killTheCache(req, res){
        res.setHeader('Cache-Control', 'No-cache')
        res.setHeader('Pragma', 'No-cache')
        delete req.headers['if-modified-since']
        delete req.headers['if-none-match']
    }
    , route: function route(uri){
        var config = this.app.config
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
        var config = this.app.config
        var routeRes = this.route(uri)
        uri = routeRes.uri
        var wasRouted = routeRes.routed
        this.killTheCache(req, res)
        var allowUnsafeDirs = config.get('unsafe_file_serving')
        var filePath = path.resolve(process.cwd(), uri)
        var ext = path.extname(filePath)
        var isPathPermitted = filePath.indexOf(process.cwd()) !== -1
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
                    fs.readdir(filePath, function(err, files){
                        var dirListingPage = __dirname + '/../views/directorylisting.html'
                        res.render(dirListingPage, {files: files})
                    })
                }else{
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
