var yaml = require('js-yaml')
  , fs = require('fs')
  , rimraf = require('rimraf')
  , Server = require('./server').Server
  , spawn = require('child_process').spawn
  , tap = require('tap')
  , path = require('path')

var tempDir = (function(){
    var platform = process.platform
    if (platform === 'win32')
        return 'C:\\Windows\\Temp'
    else
        return '/tmp'
}())

var userHomeDir = process.env.HOME || process.env.USERPROFILE

function browsersForPlatform(){
    var platform = process.platform
    if (platform === 'win32'){
        return  [
            {
                name: "IE",
                exe: "C:\\Program Files\\Internet Explorer\\iexplore.exe"
            },
            {
                name: "Firefox",
                exe: "C:\\Program Files\\Mozilla Firefox\\firefox.exe"
            },
            {
                name: "Chrome",
                exe: userHomeDir + "\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe",
                //args: ["--start-maximized"]
                args: ["--user-data-dir=" + tempDir + "\\testem.chrome", "--no-default-browser-check", "--no-first-run"],
                setup: function(done){
                    rimraf(tempDir + '\\testem.chrome', done)
                }
            },
            {
                name: "Safari",
                exe: "C:\\Program Files\\Safari\\safari.exe"
            },
            {
                name: "Opera",
                exe: "C:\\Program Files\\Opera\\opera.exe",
                args: ["-pd", tempDir + "\\testem.opera"],
                setup: function(done){
                    rimraf(tempDir + '\\testem.opera', done)
                }
            }
        ]
    }else if (platform === 'darwin'){
        return [
            {
                name: "Chrome", 
                exe: "/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome", 
                args: ["--user-data-dir=" + tempDir + "/testem.chrome", "--no-default-browser-check", "--no-first-run"],
                setup: function(done){
                    rimraf(tempDir + '/testem.chrome', done)
                }
            },
            {
                name: "Firefox", 
                exe: "/Applications/Firefox.app/Contents/MacOS/firefox"
            },
            {
                name: "Safari",
                exe: "/Applications/Safari.app/Contents/MacOS/Safari",
                args: [path.dirname(__dirname) + '/assets/safari_start.html']
            }
        ]
    }else if (platform === 'linux'){
        return []
    }
}



function App(config){
    this.config = config
    this.browsers = browsersForPlatform()
    this.tapProducer = new tap.Producer(true)
    this.tapProducer.pipe(process.stdout)
    this.testId = 1
    this.configure(function(){
        if (config.ci_browsers)
            this.browsers = this.browsers.filter(function(browser){
                return config.ci_browsers.some(function(ci_browser){
                    return ci_browser.toLowerCase() === browser.name.toLowerCase()
                })
            })
        if (config.ci_exclude_browsers)
            this.browsers = this.browsers.filter(function(browser){
                return !config.ci_exclude_browsers.some(function(ci_browser){
                    return ci_browser.toLowerCase() === browser.name.toLowerCase()
                })
            })
        this.server = new Server(this)
        this.server.on('browsers-changed', this.onBrowsersChanged.bind(this))
        this.server.on('test-result', this.onTestResult.bind(this))
        this.server.on('all-test-results', this.onAllTestResults.bind(this))
        this.server.on('server-start', this.onServerStart.bind(this))
    })
}

App.prototype = {
    configFile: 'testem.yml',
    configure: function(callback){
        var self = this
        var config = this.config
        if (config.f)
            this.configFile = config.f
        fs.readFile(this.configFile, function(err, data){
            if (err) return
            var cfg = yaml.load(String(data))
            for (var key in cfg)
                config[key] = cfg[key]
            if (callback) callback.call(self, config)
        })
    },
    onBrowsersChanged: function(){
        this.server.startTests()
    },
    onServerStart: function(){
        this.launchNextBrowser()
    },
    onTestResult: function(){
        process.stdout.write('.')
    },
    launchNextBrowser: function(){
        var url = 'http://localhost:3580'
        var browser = this.currentBrowser = this.browsers.shift()
        if (!browser){
            this.quit()
        }
        var doit = function(){
            var args = (browser.args || []).concat(url)
            console.log("# Launching " + browser.name)
            process.stdout.write('# ')
            this.browserProcess = spawn(browser.exe, args)
            this.browserProcess.on('exit', function(code){
                this.launchNextBrowser()
            }.bind(this))
        }.bind(this)
        if (browser.setup){
            browser.setup(doit)
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
        var config = this.config
          , dir = config.output
          , producer = this.tapProducer

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

    },
    quit: function(){
        this.tapProducer.end()
        process.exit(0)
    }
}

module.exports = App