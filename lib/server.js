var Express = require('express')
  , SocketIO = require('socket.io')
  , BrowserClient = require('./browserclient')
  , Mustache = require('./mustache.exp')
  , fs = require('fs')
  , util = require('util')
  , async = require('async')
  , glob = require('glob')
  , isa = require('./isa')
  , log = require('winston')
  , EventEmitter = require('events').EventEmitter
  //, log = new (require('log'))('info', fs.createWriteStream('testem.log2'))
        
require('./socket.io.patch')

function Server(app){
    this.app = app
    
    // Build the server
    this.exp = Express.createServer()
    this.initServer()
    // a list of connected browser clients
    this.browsers = []
    this.ieCompatMode = null
    
    process.nextTick(function(){
        this.emit('server-start')
    }.bind(this))
}
Server.prototype = {
    __proto__: EventEmitter.prototype,
    initServer: function(){
        var self = this
          , config = this.app.config
          , exp = this.exp
        // serve static files on ./public
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
        exp.get('/runner/', function(req, res){
            var framework = config.get('framework') || 'jasmine'
              , test_page = config.get('test_page')
              , src_files = config.get('src_files')
            res.header('Cache-Control', 'No-cache')
            res.header('Pragma', 'No-cache')
            function render(err, files){
                var runnerPage = 
                { jasmine: __dirname + '/../views/jasminerunner.html'
                , qunit: __dirname + '/../views/qunitrunner.html'
                , mocha: __dirname + '/../views/mocharunner.html'
                }[framework]
                res.render(runnerPage, {
                    locals: {scripts: files}
                })
            }

            if (test_page){
                var url = '/runner/' + test_page
                res.redirect(url + '#testem')
            }else if (isa(src_files, Array)){
                // TODO: dedup
                async.reduce(src_files, [], function(curr, pattern, next){
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

        // serve a static file from FS
        exp.get(/^\/runner\/(.+)$/, function(req, res){
            res.setHeader('Cache-Control', 'No-cache')
            res.setHeader('Pragma', 'No-cache')
            var path = req.params[0]
            self.emit('file-requested', path)
            res.sendfile(path)
        })
    

        // Create socket.io sockets
        this.io = SocketIO.listen(this.exp)

        this.io.sockets.on('connection', this.onClientConnected.bind(this))

        // Start the server!
        exp.listen(config.get('port'))
    },
    cleanUpConnections: function(){
        var count = this.browsers.length
        this.browsers = this.browsers.filter(function(browser){
            return !browser.client.disconnected
        })
        if (count !== this.browsers.length)
            this.emit('browsers-changed')
    },
    onClientConnected: function(client){
        var browser = new BrowserClient(client, this.app)
        this.browsers.push(browser)
        this.emit('browsers-changed')
        client.emit('start-tests')
    },
    startTests: function(){
        this.browsers.forEach(function(b){
            b.startTests()
        })
    },
    removeBrowser: function(browser){
        var idx = this.browsers.indexOf(browser)
        this.browsers.splice(idx, 1)
        this.emit('browsers-changed')
    }
}
exports.Server = Server
