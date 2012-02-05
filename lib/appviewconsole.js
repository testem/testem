var log = require('winston')

function AppView(app){
    this.app = app
    var config = this.app.config
    this.idle = true
    
    console.log('Open the URL below in a browser to connect.')
    var url = 'http://' + this.app.server.ipaddr + ':' + 
        this.app.server.config.port
    console.log(url)
    
    if (!config.autotest){
        if (config.wait){
            this.notifyBrowsersWaitingFor()
        }else if(config.manual){
            console.log('[Press ENTER to run tests; q to quit]')
            console.log('Available browsers:')
            process.stdin.resume()
            process.stdin.setEncoding('utf8')
            process.stdin.on('data', function(chunk){
                var s = String(chunk)
                if (s === '\n'){
                    console.log('Starting tests')
                    this.app.startTests()
                }
            }.bind(this))
        }
    }
}
AppView.prototype = {
    notifyBrowsersWaitingFor: function(){
        var more = this.config().wait - this.browsers().length
        process.stdout.write('\rWaiting for ' + more + ' more browsers...')
    },
    browsers: function(){
        return this.app.server.browsers
    },
    config: function(){
        return this.app.config
    },
    onStartTests: function(){
            
    },
    browsersString: function(){
        return (this.browsers().map(function(b){return b.name}).join(', ') || 'None')
    },
    onBrowsersChanged: function(){
        var conf = this.config()
          , browsers = this.browsers()
        if (!conf.wait && conf.manual){
            if (this.done) return
            var msg = '  ' + this.browsersString()
            process.stdout.write('\r' + msg)
        }else if (conf.wait && this.idle){
            if (conf.wait <= browsers.length && browsers.every(function(b){return !!b.name})){
                this.idle = false
                process.stdout.write('\rOk! Starting tests with browsers:\n')
                console.log('  ' + this.browsersString())
                this.app.startTests()
            }else{
                this.notifyBrowsersWaitingFor()
            }
        }
    },
    onTestResult: function(result){
        process.stdout.write('.')
    },
    onAllTestResults: function(){
        log.info('onAllTestResults')
        if (this.app.testsAllDone()){
            this.printAllResults()
            this.done = true
            //this.app.quit()
        }
    },
    printAllResults: function(){
        console.log('\nTest Results')
        console.log('============')
        this.browsers().forEach(function(browser){
            console.log(browser.name)
            var res = browser.results
            console.log('  ' + res.passed + ' / ' + res.total)
        })
    },
    onOutputTap: function(filename){
        console.log('TAP output written to ' + filename)
    },
    cleanup: function(){}
}

module.exports = AppView