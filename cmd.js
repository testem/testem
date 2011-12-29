#!/usr/bin/env node

var Server = require('./lib/server').Server
  , Fs = require('fs')
  , log = require('winston')
  , argv = require('optimist').argv
  , child_process = require('child_process')
  , AppView = require('./lib/appviewcharm')


function App(config){
    log.info('')
    log.info('=========== Starting App ==================')
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
                Fs.watch(this.configFile, function(event, filename){
                    this.configure()
                }.bind(this))
            }
        }.bind(this))
        
    },
    startPhantomJS: function(){
        var path = __dirname + '/phantom.js'
        log.info('path: ' + path)
        var phantom = child_process.spawn('phantomjs', [path])
        process.on('exit', function(){
            phantom.kill('SIGHUP')
        })
    },
    initView: function(){
        this.view = new AppView(this)
        this.view.on('inputChar', this.onInputChar.bind(this))
    },
    onInputChar: function(chr, i) {
        log.info('onInputChar')
        if (chr === 'q'){
            this.view.cleanup()
            process.exit()
        }else if (i === 13){ // ENTER
            log.info('startTests')
            this.startTests()
        }
    },
    startTests: function(){
        this.view.startRunningIndicator()
        this.server.startTests()
    },
    onBrowsersChanged: function(){
        this.view.renderBrowserHeaders()
        this.view.renderTestResults()
        this.view.renderBottomInstructions()
        this.view.refresh()
    },
    onTestResult: function(){
        this.view.renderBrowserHeaders()
        this.view.renderTestResults()
        this.view.refresh()
        this.view.renderLogPanel()
    },
    onAllTestResults: function(){
        this.view.stopRunningIndicator()
        this.view.onAllTestResults()
        this.view.renderBrowserHeaders()
        this.view.renderTestResults()
        this.view.refresh()
        this.view.renderLogPanel()
    }
}

log.remove(log.transports.Console)
if (argv.d)
    log.add(log.transports.File, {filename: 'testem.log'})

var app = new App()






