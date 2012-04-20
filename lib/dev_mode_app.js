var Server = require('./server').Server
  , debounce = require('./debounce')
  , fs = require('fs')
  , log = require('winston')
  , child_process = require('child_process')
  , AppView = require('./appviewcharm')
  , Path = require('path')

function App(config){
    this.config = config
    this.fileWatchers = {}
    
    log.info('phantomjs: ' + this.config.phantomjs)
    this.configure(function(){
        this.server = new Server(this)
        this.server.on('browsers-changed', this.onBrowsersChanged.bind(this))
        this.server.on('test-result', this.onTestResult.bind(this))
        this.server.on('all-test-results', this.onAllTestResults.bind(this))
        this.server.on('server-start', this.initView.bind(this))
    }.bind(this))
}

App.prototype = {
    configFile: 'testem.yml',
    configure: function(callback){
        var config = this.config
        var finish = function(){
            if (callback) callback(config)
        }.bind(this)

        if (config.f)
            this.configFile = config.f
        fs.stat(this.configFile, function(err, stat){
            if (err){
                finish()
            }
            else if (stat.isFile()){
                fs.readFile(this.configFile, function(err, data){
                    if (!err){
                        var cfg = require('js-yaml')
                            .load(String(data))
                        for (var key in cfg)
                            config[key] = cfg[key]
                    }
                    finish()
                })
                var i = 1
                if (!this.fileWatchers[this.configFile])
                    this.fileWatchers[this.configFile] = 
                        fs.watch(this.configFile, debounce(function(event, filename){
                            this.configure(function(){
                                this.startTests()
                            }.bind(this))
                        }.bind(this), 1000, true))
            }
        }.bind(this))
    },
    startPhantomJS: function(){
        var path = Path.dirname(__dirname) + '/assets/phantom.js'
        log.info('phantomjs path: ' + path)
        this.phantomProcess = child_process.spawn('phantomjs', [path])
        log.info('Spawning PhantomJS')
    },
    initView: function(){
        this.view = new AppView(this)
        if (this.view.on)
            this.view.on('inputChar', this.onInputChar.bind(this))
        this.startPhantomJS()
    },
    quit: function(code){
        if (this.phantomProcess)
            this.phantomProcess.kill('SIGTERM')
        setTimeout(function(){
            this.view.cleanup()
            process.exit(code)
        }.bind(this), 100)
    }, 
    onInputChar: function(chr, i) {
        if (chr === 'q')
            this.quit()
        else if (i === 13) // ENTER
            this.startTests()
    },
    startTests: function(){
        this.view.onStartTests()
        this.server.startTests()
    },
    onBrowsersChanged: function(){
        this.view.onBrowsersChanged()
    },
    onTestResult: function(result, browser){
        this.view.onTestResult(result, browser)
    },
    testsAllDone: function(){
        return this.server.browsers.every(function(b){
            return b.results && b.results.all})
    },
    onAllTestResults: function(results){
        this.view.onAllTestResults(results)
    }
}

module.exports = App