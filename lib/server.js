var Express = require('express'),
    SocketIO = require('socket.io'),
    BrowserClient = require('browserclient'),
    Mustache = require('mustache.exp')
    
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

    // serve static files on ./public
    this.exp.configure(function(){
        this.exp.register(".html", Mustache)
        this.exp.set("view options", {layout: false})
        this.exp.use(Express.static(__dirname + '/../public'))
    }.bind(this))

    this.exp.get('/runner/', function(req, res){
        var scripts = ['/jasmine.js', '/jasmine-html.js', 
            '/jasmine_adapter.js',
            'hello.js', 'hello_spec.js'],
            css = ['/jasmine.css']
        res.render('runner.html', {
            locals: {scripts: scripts, css: css}
        })
    })

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