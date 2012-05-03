var yaml = require('js-yaml')
  , fs = require('fs')
  , Server = require('./server').Server
  , spawn = require('child_process').spawn
  , tap = require('tap')
  , path = require('path')
  , async = require('async')
  , browser_launcher = require('./browser_launcher')
  , Config = require('./config')

function App(progOptions){
    this.config = new Config(progOptions)
    this.browsers = browser_launcher.browsersForPlatform()
    var browsers = this.config.get('browsers')
      , skip = this.config.get('skip')
    if (browsers){
        var wantedBrowsers = browsers.toLowerCase().split(',')
        this.browsers = this.browsers.filter(function(browser){
            return wantedBrowsers.indexOf(browser.name.toLowerCase()) !== -1
        })
    }
    if (skip){
        var unwantedBrowsers = skip.toLowerCase().split(',')
        this.browsers = this.browsers.filter(function(browser){
            return unwantedBrowsers.indexOf(browser.name.toLowerCase()) === -1
        })
    }
    if (this.config.get('list')){
        this.printAvailableBrowsers()
    }else{
        this.initialize()
    }
}

App.prototype = {
    initialize: function(){
        var config = this.config
        this.tapProducer = new tap.Producer(true)
        this.tapProducer.pipe(process.stdout)
        this.testId = 1
        this.failed = false
        this.testsStarted = false
        this.config.read(function(){
            this.server = new Server(this)
            this.server.on('browsers-changed', this.onBrowsersChanged.bind(this))
            this.server.on('test-result', this.onTestResult.bind(this))
            this.server.on('all-test-results', this.onAllTestResults.bind(this))
            this.server.on('server-start', this.onServerStart.bind(this))
        }.bind(this))
    },
    onBrowsersChanged: function(){
        if (!this.testsStarted){
            this.server.startTests()
            this.testsStarted = true
        }
    },
    onServerStart: function(){
        this.launchNextBrowser()
    },
    onTestResult: function(){
        process.stdout.write('.')
    },
    launchNextBrowser: function(){
        var url = 'http://localhost:' + this.config.get('port')
        var browser = this.currentBrowser = this.browsers.shift()
        var self = this
        if (!browser){
            this.quit()
        }
        var doit = function(){
            function launch(exe){                    
                console.log("# Launching " + browser.name)
                process.stdout.write('# ')
                var args = [url]
                if (browser.args instanceof Array)
                    args = browser.args.concat(args)
                else if (browser.args instanceof Function)
                    args = browser.args(self)
                self.browserProcess = spawn(exe, args)
                self.browserProcess.on('exit', function(code){
                    self.launchNextBrowser()
                })
            }
            browser.supported(function(yes){
                if (!yes){
                    // executable not found , skip to next
                    self.launchNextBrowser()
                }else{
                    var exes = Array.isArray(browser.exe) ? browser.exe : [browser.exe]
                    async.filter(exes, path.exists, function(found){
                        launch(found[0])
                    })
                }
            })
        }
        if (browser.setup){
            browser.setup(this, doit)
        }else{
            doit()
        }
    },
    onAllTestResults: function(results, browser){
        var doit = function(){
            this.outputTap(results, browser)
            this.browserProcess.kill('SIGTERM')
        }.bind(this)
        if (this.currentBrowser.teardown)
            this.currentBrowser.teardown(doit)
        else
            doit()
            
    },
    outputTap: function(results, browser){
        var producer = this.tapProducer

        console.log()
        
        results.tests.forEach(function(test){
            var testName = ' - ' + browser.name + '  ' + test.name
            if (test.failed === 0){
                producer.write({
                    id: this.testId++,
                    ok: true,
                    name: testName
                })
            }else{
                this.failed = true
                var item = test.items.filter(function(i){
                    return !i.passed
                })[0]

                producer.write({
                    id: this.testId++,
                    ok: false,
                    name: testName,
                    message: item.message
                })

                // TODO: add stacktraces and file and line number
            }
        }.bind(this))

        console.log()
    },
    printAvailableBrowsers: function(){
        function browserExeExists(browser, cb){
            browser.supported(cb)
        }
        async.filter(this.browsers, browserExeExists, function(browsers){
            console.log('Browsers available on this system: ')
            console.log(browsers.map(function(b){return b.name}).join('\n'))
        })
    },
    quit: function(){
        this.tapProducer.end()
        var code = this.failed ? 1 : 0
        process.exit(code)
    }
}

module.exports = App