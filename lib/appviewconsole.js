var log = require('winston')
  , path = require('path')
  , fs = require('fs')

function AppView(app){
    this.app = app
    var config = this.app.config
    this.idle = true
    
    this.print('Open the URL below in a browser to connect.')
    var url = 'http://' + this.app.server.ipaddr + ':' + 
        this.app.server.config.port
    this.print(url)
    
    this.notifyBrowsersWaitingFor()
}
AppView.prototype = {
    print: function(msg){
        console.log('# ' + msg)
    },
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
        if (this.idle){
            if (conf.wait <= browsers.length && browsers.every(function(b){return !!b.name})){
                this.idle = false
                process.stdout.write('\r# Ok! Starting tests with browsers: ' +
                    this.browsersString() + '\n# ')
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
        if (this.app.testsAllDone()){
            process.stdout.write('\n')
            if (this.config().tap){
                this.outputTap()
            }else{
                this.quit()
            }
        }
    },
    quit: function(){
        this.done = true
        var passed = this.app.server.browsers.every(function(b){
            return b.results.failed === 0
        })
        var code = passed ? 0 : 1
        this.app.quit(code)
    },
    allTapsWritten: function(){
        return this.app.server.browsers.every(function(browser){
            return browser.tapWrittenOut
        })
    },
    outputTap: function(){
        var config = this.config()
          , browsers = this.app.server.browsers
          , dir = config.output
          , producer = new (require('tap').Producer)(true)
        
        producer.pipe(process.stdout)
        
        console.log()
        
        var id = 1
        
        browsers.forEach(function(browser){
        
            browser.results.tests.forEach(function(test){
                var testName = browser.name + ' - ' + test.name
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
            
        })
        
        producer.end()
        this.quit()
        
    },
    cleanup: function(){}
}

module.exports = AppView