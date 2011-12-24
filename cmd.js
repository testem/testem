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
    this.config = config
    this.server = new Server(this)
    this.server.on('browsers-changed', this.onBrowsersChanged.bind(this))
    this.server.on('test-result', this.onTestResult.bind(this))
    this.server.on('all-test-results', this.onAllTestResults.bind(this))
    this.server.on('server-start', this.initView.bind(this))
}

App.prototype = {
    initView: function(){
        this.view = new AppView(this)
        this.view.on('inputChar', this.onInputChar.bind(this))
    },
    onInputChar: function(chr, i) {
        if (chr === 'q'){
            this.view.cleanup()
            process.exit()
        }else if (i === 13){ // ENTER
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

// App config
var config = {
    port: 3580
}


function listFiles(cb){
    Fs.readdir('./', function(err, files){
        if (err)
            cb(err, files)
        else
            cb(null, files.filter(function(file){
                return file.match(/\.js$/)
            }).sort())
    })    
}
config.autotest = true
config.phantomjs = true



log.remove(log.transports.Console)
if (argv.d)
    log.add(log.transports.File, {filename: 'testem.log'})
if (argv.m)
    config.autotest = false

!function(){
    var conf = require('js-yaml').load(String(Fs.readFileSync('testem.yml')))
    log.info('Config: ' + JSON.stringify(conf))
    for (var key in conf)
        config[key] = conf[key]
}()

if (!config.src_files)
    config.src_files = listFiles

function startPhantomJS(){
    var path = __dirname + '/phantom.js'
    log.info('path: ' + path)
    var phantom = child_process.spawn('phantomjs', [path])
    process.on('exit', function(){
        phantom.kill('SIGHUP')
    })
}

log.info(JSON.stringify(config))

var app = new App(config)
if (config.phantomjs)
    app.server.on('server-start', function(){
        startPhantomJS()
    })





