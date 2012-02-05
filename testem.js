#!/usr/bin/env node

var Server = require('./lib/server').Server
  , debounce = require('./lib/debounce')
  , fs = require('fs')
  , log = require('winston')
  , child_process = require('child_process')
  , program = require('commander')
  , AppView
  , ci = false
  , config = program
  
program
    .version('0.0.3')
    .usage('[options]')
    .option('-f [file]', 'Config file')
    .option('-p, --port [num]', 'Server port - Defaults to 3580', 3580)
    .option('-a, --no-autotest', 'Disable autotest')
    .option('-d, --debug', 'Output debug to debug log')
    .option('--debuglog', 'Name of debug log file. Defaults to testem.log')
    .option('--no-phantomjs', 'Disable PhantomJS')

program
    .command('ci')
    .description('Continuous integration mode')
    .option('-w, --wait [num]', 'Wait for [num] of browsers before auto-starting tests for CI', 1)
    .option('-t, --tap', 'Output TAP(Test Anything Protocal) files')
    .option('-o, --output [dir]', 'Output directory for TAP files', '')
    .option('-p, --port [num]', 'Server port - Defaults to 3580', 3580)
    .action(function(env){
        ci = true
        config = env
        config.ci = true
    })

program.parse(process.argv)

AppView = ci ? 
    require('./lib/appviewconsole') :
    require('./lib/appviewcharm')

function App(config){
    this.config = config
    this.fileWatchers = {}
    
    this.configure(function(){
        this.server = new Server(this)
        this.server.on('browsers-changed', this.onBrowsersChanged.bind(this))
        this.server.on('test-result', this.onTestResult.bind(this))
        this.server.on('all-test-results', this.onAllTestResults.bind(this))
        this.server.on('server-start', this.initView.bind(this))
    
        if (!this.config.nophantomjs)
            app.server.on('server-start', function(){
                this.startPhantomJS()
            }.bind(this))
    }.bind(this))
}

App.prototype = {
    configFile: 'testem.yml',
    listFiles: function listFiles(cb){
        fs.readdir('./', function(err, files){
            if (err)
                cb(err, files)
            else
                cb(null, files.filter(function(file){
                    return file.match(/\.js$/)
                }).sort())
        })    
    },
    configure: function(callback){
        var finish = function(){
            if (!config.src_files)
                config.src_files = this.listFiles
            if (callback) callback(config)
        }.bind(this)

        if (config.f)
          this.configFile = config.f
        fs.stat(this.configFile, function(err, stat){
            if (err) finish()
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
        var path = __dirname + '/phantom.js'
        this.phantomProcess = child_process.spawn('/Applications/phantomjs.app/Contents/MacOS/phantomjs', [path])
    },
    initView: function(){
        this.view = new AppView(this)
        if (this.view.on)
            this.view.on('inputChar', this.onInputChar.bind(this))
    },
    quit: function(){
        this.phantomProcess.kill('SIGHUP')
        setTimeout(function(){
            this.view.cleanup()
            process.exit()
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
    },

}

log.remove(log.transports.Console)
if (config.debug){
    var logfile = config.debuglog || 'testem.log'
    log.add(log.transports.File, {filename: logfile})
}

var app = new App(config)
