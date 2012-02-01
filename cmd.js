#!/usr/bin/env node
//
// Command line options
// --config <relative path to a testem.yml
//       -m configure autotest
//
var Server = require('./lib/server').Server
  , Fs = require('fs')
  , log = require('winston')
  , argv = require('optimist').argv
  , child_process = require('child_process')
  , AppView
  
if (argv.t)
    AppView = require('./lib/appviewtap')
else
    AppView = require('./lib/appviewcharm')

// <http://unscriptable.com/index.php/2009/03/20/debouncing-javascript-methods/>
var debounce = function (func, threshold, execAsap) {
 
    var timeout;
 
    return function debounced () {
        var obj = this, args = arguments;
        function delayed () {
            if (!execAsap)
                func.apply(obj, args);
            timeout = null; 
        };
 
        if (timeout)
            clearTimeout(timeout);
        else if (execAsap)
            func.apply(obj, args);
 
        timeout = setTimeout(delayed, threshold || 100); 
    };
 
}


function App(config){
    log.info('')
    log.info('=========== Starting App ==================')
    this.fileWatchers = {}
    this.configure(function(){
        this.server = new Server(this)
        this.server.on('browsers-changed', this.onBrowsersChanged.bind(this))
        this.server.on('test-result', this.onTestResult.bind(this))
        this.server.on('all-test-results', this.onAllTestResults.bind(this))
        this.server.on('server-start', this.initView.bind(this))
    
        if (this.config.phantomjs)
            app.server.on('server-start', function(){
                this.startPhantomJS()
            }.bind(this))
    }.bind(this))
}

App.prototype = {
    configFile: 'testem.yml',
    listFiles: function listFiles(cb){
        Fs.readdir('./', function(err, files){
            if (err)
                cb(err, files)
            else
                cb(null, files.filter(function(file){
                    return file.match(/\.js$/)
                }).sort())
        })    
    },
    configure: function(callback){
        var config = this.config = {
            port: 3580,
            autotest: true,
            phantomjs: true
        }

        if (argv.m)
            config.autotest = false

        var finish = function(){
            if (!config.src_files)
                config.src_files = this.listFiles
            if (callback) callback(config)
        }.bind(this)

        if (argv.config)
          this.configFile = argv.config
        Fs.stat(this.configFile, function(err, stat){
            if (err) finish()
            else if (stat.isFile()){
                Fs.readFile(this.configFile, function(err, data){
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
                        Fs.watch(this.configFile, debounce(function(event, filename){
                            this.configure(function(){
                                this.startTests()
                            }.bind(this))
                        }.bind(this), 1000, true))
            }
        }.bind(this))
        
    },
    startPhantomJS: function(){
        var path = __dirname + '/phantom.js'
        this.phantomProcess = child_process.spawn('phantomjs', [path])
    },
    initView: function(){
        this.view = new AppView(this)
        if (this.view.on)
            this.view.on('inputChar', this.onInputChar.bind(this))
    },
    onInputChar: function(chr, i) {
        if (chr === 'q'){
            this.phantomProcess.kill('SIGHUP')
            setTimeout(function(){
                
                this.view.cleanup()
                process.exit()
            }.bind(this), 100)
        }else if (i === 13){ // ENTER
            this.startTests()
        }
    },
    startTests: function(){
        this.view.onStartTests()
        this.server.startTests()
    },
    onBrowsersChanged: function(){
        this.view.onBrowsersChanged()
    },
    onTestResult: function(result){
        this.view.onTestResult(result)
    },
    onAllTestResults: function(results){
        this.view.onAllTestResults(results)
    }
}

log.remove(log.transports.Console)
if (argv.d)
    log.add(log.transports.File, {filename: 'testem.log'})

var app = new App()






