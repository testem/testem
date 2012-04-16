var yaml = require('js-yaml')
  , fs = require('fs')
  , Server = require('./server').Server
  , spawn = require('child_process').spawn

function App(config){
    this.config = config
    this.browsers = [
        ["Chrome", "/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome", ["--user-data-dir=/tmp/chrome", "--no-default-browser-check", "--no-first-run"]],
        ["Firefox", "/Applications/Firefox.app/Contents/MacOS/firefox"]
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
            console.log(JSON.stringify(cfg))
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
        var browser = this.browsers.shift()
        if (!browser){
            this.quit()
        }
        var name = browser[0]
        var exe = browser[1]
        var args = (browser[2] || []).concat(url)
        console.log("Launching " + name)
        this.browserProcess = spawn(exe, args)
    },
    onAllTestResults: function(results){
        console.log('Got results ' + JSON.stringify(results))
        this.browserProcess.kill('SIGTERM')
        setTimeout(function(){
            this.launchNextBrowser()
        }.bind(this), 1000)
    },
    quit: function(){
        process.exit(0)
    }
}

module.exports = App