var Express = require('express')
  , SocketIO = require('socket.io')
  , BrowserClient = require('./browserclient')
  , Mustache = require('./mustache.exp')
  , fs = require('fs')
  , isa = require('./isa')
  , log = require('winston')
  //, log = new (require('log'))('info', fs.createWriteStream('testem.log2'))
    
// Convience functions
var getipaddr = require('./getipaddr')
        
require('./socket.io.patch')

function Server(app){
    this.app = app
    
    // Build the server
    this.exp = Express.createServer()
    // a list of connected browser clients
    this.browsers = []
    
    this.fileWatchers = {}
    this.lastModTime = {}
    this._onFileChanged = this.onFileChange.bind(this)
    this.monitorFiles(this.initServer.bind(this))
    
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
    initServer: function(){
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
                var url = '/runner/' + this.config.test_page
                res.redirect(url + '#testem')
            }else if (isa(this.config.src_files, Array)){
                var files = this.config.src_files
                render(files)
            }else if(isa(this.config.src_files, Function)){
                this.config.src_files(function(err, files){
                    if (err)
                        throw err
                    render(files)
                }.bind(this))
            }

        }.bind(this))

        // serve a static file from FS
        this.exp.get(/^\/runner\/(.+)$/, function(req, res){
            res.setHeader('Cache-Control', 'No-cache')
            res.setHeader('Pragma', 'No-cache')
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
    },
    monitorFiles: function(callback){
        this.unwatchFiles()
        if (this.config.test_page){
            this.trackFile(this.config.test_page)
            callback()
        }else if (isa(this.config.src_files, Array)){
            var files = this.config.src_files
            files.forEach(this.trackFile.bind(this))
            callback()
        }else if(isa(this.config.src_files, Function)){
            this.config.src_files(function(err, files){
                if (!err){
                    files.forEach(this.trackFile.bind(this))
                    callback()
                }
            }.bind(this))
        }
    },
    trackFile: function(filepath){
        if (this.fileWatchers[filepath]) return
        // Get stat initially
        fs.stat(filepath, function(err, stats){
            if (err) return
            this.lastModTime[filepath] = stats.mtime
            this.fileWatchers[filepath] = fs.watch(filepath, function(event){
                fs.stat(filepath, function(err, stats){
                    if (err) return
                    var lastMTime = this.lastModTime[filepath]
                    if (!lastMTime || (stats.mtime > lastMTime)){
                        this.onFileChange(event, filepath)
                        this.lastModTime[filepath] = stats.mtime
                    }
                }.bind(this))
            }.bind(this))
        }.bind(this))
    },
    unwatchFiles: function(){
        for (var path in this.fileWatchers){
            var fw = this.fileWatchers[path]
            fw.close()
        }
        this.fileWatchers = {}
    },
    onFileChange: function(event, filename){
        log.info('file ' + filename + ' changed.')
        this.app.configure(function(){
            this.monitorFiles(function(){
                this.app.startTests()
            }.bind(this))
        }.bind(this))
    },
    on: function(event, cb){
        if (event in this.cbs)
            this.cbs[event].push(cb)
    },
    notify: function(event){
        var args = Array.prototype.slice.call(arguments, 1)
        if (event in this.cbs){
            this.cbs[event].forEach(function(cb){
                cb.apply(null, args)
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
        var config = this.app.config
        if (config.autotest && !config.ci)
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
Object.defineProperty(Server.prototype, 'config', {
    get: function(){
        return this.app.config
    }
})
exports.Server = Server