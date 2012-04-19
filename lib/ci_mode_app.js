var yaml = require('js-yaml')
  , fs = require('fs')
  , rimraf = require('rimraf')
  , Server = require('./server').Server
  , spawn = require('child_process').spawn
  , tap = require('tap')

function App(config){
    this.config = config
    this.browsers = [
        {
            name: "Chrome", 
            exe: "/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome", 
            args: ["--user-data-dir=/tmp/testem.chrome", "--no-default-browser-check", "--no-first-run"],
            setup: function(done){
                rimraf('/tmp/testem.chrome', done)
            }
        },
        {
            name: "Firefox", 
            exe: "/Applications/Firefox.app/Contents/MacOS/firefox"
        },
        {
            name: "Safari",
            exe: "/Applications/Safari.app/Contents/MacOS/Safari",
            args: ['index.html']
        }
    ]
    this.configure(function(){
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
        }.bind(this)
        if (browser.setup){
            browser.setup(doit)
        }else{
            doit()
        }
    },
    onAllTestResults: function(results, browser){
        this.browserProcess.kill('SIGTERM')
        var doit = function(){
            this.outputTap(results, browser)
            this.launchNextBrowser()
        }.bind(this)
        if (this.currentBrowser.teardown)
            this.currentBrowser.teardown(doit)
        else
            doit()
            
    },
    outputTap: function(results, browser){
        var config = this.config
          , dir = config.output
          , producer = new tap.Producer(true)

        producer.pipe(process.stdout)

        console.log()

        var id = 1
        
        results.tests.forEach(function(test){
            var testName = ' - ' + browser.name + '  ' + test.name
            if (test.failed === 0){
                producer.write({
                    id: id++,
                    ok: true,
                    name: testName
                })
            }else{
                var item = test.items.filter(function(i){
                    return !i.passed
                })[0]

                producer.write({
                    id: id++,
                    ok: false,
                    name: testName,
                    message: item.message
                })

                // TODO: add stacktraces and file and line number
            }
        })

        producer.end()
        console.log()
    },
    quit: function(){
        process.exit(0)
    }
}

module.exports = App