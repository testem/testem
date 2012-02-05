#!/usr/bin/env node
//
// Command line options
// --config <relative path to a testem.yml
//       -m configure autotest
//
var Server = require('./lib/server').Server
  , debounce = require('./lib/debounce')
  , Fs = require('fs')
  , log = require('winston')
  , child_process = require('child_process')
  , program = require('commander')
  , path = require('path')
  , AppView
  
program
    .version('0.0.3')
    .usage('[options]')
    .option('-f [file]', 'Config file')
    .option('-c, --ci', 'Continuous Integration mode')
    .option('-w, --wait [num]', 'Wait for [num] of browsers before auto-starting tests for CI')
    .option('-t, --tap', 'Output TAP(Test Anything Protocal) files')
    .option('-o, --output [dir]', 'Output directory for TAP files', '')
    .option('-p, --port [num]', 'Server port - Defaults to 3580', 3580)
    .option('-m, --manual', 'Manual(default is autotest)')
    .option('-a, --autotest', 'Autotest(default)')
    .option('-d, --debug', 'Output debug to debug log')
    .option('--debuglog', 'Name of debug log file. Defaults to testem.log')
    .option('--nophantomjs', 'Disable PhantomJS')
    .parse(process.argv)

program.autotest = !program.manual

if (program.ci)
    AppView = require('./lib/appviewconsole')
else
    AppView = require('./lib/appviewcharm')

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
    
        if (!this.config.nophantomjs)
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
        var config = this.config = program

        if (!program.manual || program.autotest)
            config.autotest = true

        var finish = function(){
            if (!config.src_files)
                config.src_files = this.listFiles
            if (callback) callback(config)
        }.bind(this)

        if (program.f)
          this.configFile = program.f
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
        if (this.config.tap && this.testsAllDone()){
            this.server.browsers.forEach(function(browser){
                this.outputTap(browser.results, browser)
            }.bind(this))
        }
        this.view.onAllTestResults(results)
    },
    outputTap: function(results, browser){
        var dir = this.config.output
          , filename = browser.name.replace(/ /g, '_') + '.tap'
          , filepath = path.normalize((this.config.output ? this.config.output + '/' : '') + filename)
          , out = Fs.createWriteStream(filepath)
          , producer = new (require('tap').Producer)(true)
        
        producer.pipe(out)
        
        var id = 1
        
        results.tests.forEach(function(test){
            if (test.failed === 0){
                producer.write({
                    id: id++,
                    ok: true,
                    name: test.name
                })
            }else{
                var item = test.items.filter(function(i){
                    return !i.passed
                })[0]

                producer.write({
                    id: id++,
                    ok: false,
                    name: test.name,
                    message: item.message
                })
                
                // TODO: add stacktraces and file and line number
            }
        })
        
        producer.end()
        
        out.on('close', function(){
            this.view.onOutputTap(filepath)
            // TODO: quit() should probably be called elsewhere, not sure how yet
            this.quit()
        }.bind(this))
        
    }
}

log.remove(log.transports.Console)
if (program.debug){
    var logfile = program.debuglog || 'testem.log'
    log.add(log.transports.File, {filename: logfile})
}

var app = new App()
