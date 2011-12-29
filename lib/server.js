var Express = require('express')
  , SocketIO = require('socket.io')
  , BrowserClient = require('./browserclient')
  , Mustache = require('./mustache.exp')
  , fs = require('fs')
  , isa = require('./isa')
  , log = require('winston')
    
// Convience functions
var getipaddr = require('./getipaddr')
        
require('./socket.io.patch')

function Server(app){
    
    this.app = app
    this.config = app.config
    
    // Build the server
    this.exp = Express.createServer()
    // a list of connected browser clients
    this.browsers = []
    
    this.fileWatchers = []

    this._onFileChanged = this.onFileChange.bind(this)
    
    // serve static files on ./public
    this.exp.configure(function(){
        this.exp.register(".html", Mustache)
        this.exp.set("view options", {layout: false})
        this.exp.use(Express.static(__dirname + '/../public'))
    }.bind(this))

    this.exp.get('/runner/', function(req, res){
        res.setHeader('Cache-Control', 'No-cache')
        res.setHeader('Pragma', 'No-cache')
        var render = function render(files){
            var scripts = this.config.framework === 'qunit' ?
                ['/qunit.js'] :
                ['/jasmine.js',
                '/jasmine-html.js']
            var runnerPage = this.config.framework === 'qunit' ?
                __dirname + '/../views/qunitrunner.html' :
                __dirname + '/../views/jasminerunner.html'
            scripts = scripts.concat(files)
            res.render(runnerPage, {
                locals: {scripts: scripts}
            })
        }.bind(this)
        
        if (this.config.test_page){
            res.sendfile(this.config.test_page)
            this.trackFile(this.config.test_page)
        }else if (isa(this.config.src_files, Array)){
            var files = this.config.src_files
            log.info('src_files array')
            this.setFiles(files)
            render(files)
        }else if(isa(this.config.src_files, Function))
            this.config.src_files(function(err, files){
                this.setFiles(files)
                if (err)
                    throw err
                render(files)
            }.bind(this))
    }.bind(this))

    // serve a static file from FS
    this.exp.get(/^\/runner\/(.+)$/, function(req, res){
        var path = req.params[0]
        this.trackFile(path)
        res.sendfile(path)
    }.bind(this))

    // Create socket.io sockets
    this.io = SocketIO.listen(this.exp)
    //io.set('close timeout', 8)
    //io.set('heartbeat timeout', 3)
    
    this.io.sockets.on('connection', this.onClientConnected.bind(this))
    
    // Start the server!
    this.exp.listen(this.config.port)
    
    // Event callbacks
    this.cbs = {
        'browsers-changed': [],
        'test-result': [],
        'test-start': [],
        'all-test-results': [],
        'server-start': []
    }
    
    getipaddr(function(err, ip){
        this.ipaddr = err ? 'localhost' : ip
        this.notify('server-start')
    }.bind(this))
}
Server.prototype = {
    trackFile: function(filepath){
        this.fileWatchers.push(fs.watch(filepath, this._onFileChanged))
        log.info('tracked ' + filepath)
    },
    setFiles: function(files){
        this.unwatchFiles()
        files.forEach(function(file){
            this.trackFile(file)
        }.bind(this))
    },
    unwatchFiles: function(){
        if (!this.fileWatchers) return 
        this.fileWatchers.forEach(function(fw){
            fw.close()
        })
    },
    onFileChange: function(event, filename){
        this.unwatchFiles()
        this.app.configure(function(){
            this.app.startTests()
        }.bind(this))
    },
    on: function(event, cb){
        if (event in this.cbs)
            this.cbs[event].push(cb)
    },
    notify: function(event){
        if (event in this.cbs){
            this.cbs[event].forEach(function(cb){
                cb()
            })
        }
    },
    cleanUpConnections: function(){
        var count = this.browsers.length
        this.browsers = this.browsers.filter(function(browser){
            return !browser.client.disconnected
        })
        if (count !== this.browsers.length)
            this.notify('browsers-changed')
    },
    onClientConnected: function(client){
        var browser = new BrowserClient(client, this.app)
        this.browsers.push(browser)
        this.notify('browsers-changed')
        if (this.app.config.autotest)
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
        this.notify('browsers-changed')
    }
}
exports.Server = Server