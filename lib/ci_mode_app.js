/*

ci_mode_app.js
==============

The entry point for CI mode.

*/

var yaml = require('js-yaml')
var fs = require('fs')
var Server = require('./server')
var spawn = require('child_process').spawn
var tap = require('tap')
var path = require('path')
var async = require('async')
var Backbone = require('backbone')
var Config = require('./config')
var log = require('winston')
var TestResults = require('./runners').TestResults
var BaseApp = require('./base_app')

var fileExists = fs.exists || path.exists

function App(config){
    BaseApp.call(this, config)
    var self = this
    config.getLaunchers(this, function(launchers){
        self.launchers = launchers
        self.initialize()
    })
}

App.prototype = {
    __proto__: BaseApp.prototype
    , initialize: function(){
        var config = this.config
        this.tapProducer = new tap.Producer(true)
        this.tapProducer.pipe(process.stdout)
        this.testId = 1
        this.failed = false
        this.testsStarted = false
        this.server = new Server(this)
        with(this.server){
            on('browsers-changed', this.onBrowsersChanged.bind(this))
            on('test-result', this.onTestResult.bind(this))
            on('server-start', this.onServerStart.bind(this))
        }
        this.server.start()
    }
    , onBrowsersChanged: function(){
        if (!this.testsStarted){
            this.server.startTests()
            this.testsStarted = true
        }
    }
    , onServerStart: function(){
        var self = this
        this.runPreprocessors(function(){
            self.runAllTheTests()
        })
    }
    , runAllTheTests: function(){
        var self = this
        var url = 'http://localhost:' + this.config.get('port')
        async.forEachSeries(this.launchers, function(launcher, next){
            console.log("# Launching " + launcher.name)
            process.stdout.write('# ')
            
            var processExited, gotTestResults

            function finish(){
                if (launcher.tearDown){
                    launcher.tearDown(next)
                }else{
                    next()
                }
            }

            launcher.once('processExit', function(code){
                processExited = true
                if (launcher.settings.protocol === 'browser' ||
                    launcher.settings.protocol === 'tap'){
                    if (gotTestResults) finish()
                }else{
                    var results = new TestResults
                    var command = launcher.settings.command
                    var runner = launcher.runner
                    var stdout = runner.get('messages')
                        .filter(function(m){
                            return m.get('type') === 'log'
                        }).map(function(m){
                            return m.get('text')
                        }).join('\n')
                    var stderr = runner.get('messages')
                        .filter(function(m){
                            return m.get('type') === 'error'
                        }).map(function(m){
                            return m.get('text')
                        }).join('\n')
                    var result = {
                        passed: code === 0
                        , failed: code !== 0
                        , total: 1
                        , id: 1
                        , name: '"' + command + '"'
                        , items: [{
                            passed: false
                            , message: 'Exited with code ' + code
                            , stdout: stdout
                            , stderr: stderr
                        }]
                    }
                    results.addResult(result)
                    runner.set('results', results)
                    
                    self.emit('all-test-results', results)
                }
            })

            self.once('all-test-results', function(results){
                gotTestResults = true
                self.outputTap(results, launcher)
                if (processExited) finish()
                else launcher.kill('SIGKILL')

            })

            var timeout
            if (timeout = self.config.get('timeout')){
                var killTimeout = setTimeout(function(){
                    console.log('\n# Timing out ' + browser.name + 
                        ' after waiting for ' + timeout + ' seconds')
                    launcher.kill('SIGKILL')
                }, timeout * 1000)
            }


            if (launcher.setup){
                launcher.setup(self, function(){
                    launcher.start()
                })
            }else{
                launcher.start()
            }

        }, function(){  
            self.quit()
        })
    }
    , onTestResult: function(){
        process.stdout.write('.')
    }
    , outputTap: function(results, browser){
        var producer = this.tapProducer

        console.log() // new line
        
        results.get('tests').forEach(function(test){
            var testName = ' - ' + browser.name + '  ' + test.get('name')
            if (!test.get('failed')){
                producer.write({
                    id: this.testId++,
                    ok: true,
                    name: testName
                })
            }else{
                this.failed = true
                var item = test.get('items').filter(function(i){
                    return !i.passed
                })[0]

                var line = {
                    id: this.testId++
                    , ok: false
                    , name: testName
                    , message: item.message
                }
                if (item.stacktrace) line.stacktrace = item.stacktrace
                if (item.stdout) line.stdout = item.stdout
                if (item.stderr) line.stderr = item.stderr
                producer.write(line)
                
            }
        }.bind(this))

        console.log() // new line
    }
    , quit: function(){
        this.tapProducer.end()
        var code = this.failed ? 1 : 0
        process.nextTick(function(){
            process.exit(code)
        })
    }
}

module.exports = App