var Express = require('express'),
    SocketIO = require('socket.io'),
    BrowserClient = require('browserclient'),
    Mustache = require('mustache.exp'),
    fs = require('fs'),
    isa = require('isa'),
    log = require('winston')
    
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
        function render(files){
            
            /*
            var scripts = [
                '/jasmine.js', 
                '/jasmine-html.js', 
                '/jasmine_adapter.js']
                    .concat(files),
                css = ['/jasmine.css']
            res.render(__dirname + '/../views/runner.html', {
                locals: {scripts: scripts, css: css}
            })
            */
            var scripts = [
                '/qunit.js', 
                '/qunit_adapter.js']
                    .concat(files),
                css = []
            res.render(__dirname + '/../views/qunitrunner.html', {
                locals: {scripts: scripts, css: css}
            })
        }
        
        if (isa(this.config.files, Array))
            render(this.config.files)
        else if(isa(this.config.files, Function))
            this.config.files(function(err, files){
                this.setFiles(files)
                if (err)
                    throw err
                render(files)
            }.bind(this))
    }.bind(this))

    // serve a static file from FS
    this.exp.get(/^\/runner\/(.+)$/, function(req, res){
        var path = req.params[0]
        res.sendfile(path)
    })

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
    setFiles: function(files){
        this.unwatchFiles()
        this.currentFiles = files
        files.forEach(function(file){
            fs.watchFile(file, this._onFileChanged)
        }.bind(this))
    },
    unwatchFiles: function(){
        if (!this.currentFiles) return 
        this.currentFiles.forEach(function(file){
            fs.unwatchFile(file)
        })
    },
    onFileChange: function(curr, prev){
        if (this.app.config.autotest && curr.mtime.getTime() > prev.mtime.getTime()){
            this.startTests()
        }
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
            b.client.emit('start-tests')
        })
    },
    removeBrowser: function(browser){
        var idx = this.browsers.indexOf(browser)
        this.browsers.splice(idx, 1)
        this.notify('browsers-changed')
    }
}
exports.Server = Server