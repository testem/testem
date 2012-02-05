var log = require('winston')
  , path = require('path')
  , fs = require('fs')

function AppView(app){
    this.app = app
    var config = this.app.config
    this.idle = true
    
    console.log('Open the URL below in a browser to connect.')
    var url = 'http://' + this.app.server.ipaddr + ':' + 
        this.app.server.config.port
    console.log(url)
    
    this.notifyBrowsersWaitingFor()
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
        if (this.idle){
            if (conf.wait <= browsers.length && browsers.every(function(b){return !!b.name})){
                this.idle = false
                process.stdout.write('\rOk! Starting tests with browsers: ' +
                    this.browsersString() + '\n')
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
            this.printAllResults()
            if (this.config().tap){
                var doneWriteTap = function(){
                    if (this.allTapsWritten()){
                        this.quit()
                    }
                }.bind(this)
                this.app.server.browsers.forEach(function(browser){
                    this.outputTap(browser.results, browser, doneWriteTap)
                }.bind(this))
            }else{
                this.quit()
            }
        }
    },
    quit: function(){
        this.done = true
        this.app.quit()
    },
    printAllResults: function(){
        console.log()
        this.browsers().forEach(function(browser){
            var res = browser.results
            console.log(browser.name + ': ' + res.passed + '/' + res.total)
        })
    },
    allTapsWritten: function(){
        return this.app.server.browsers.every(function(browser){
            return browser.tapWrittenOut
        })
    },
    outputTap: function(results, browser, callback){
        var config = this.config()
          , dir = config.output
          , filename = browser.name.replace(/ /g, '_') + '.tap'
          , filepath = path.normalize((config.output ? config.output + '/' : '') + filename)
          , out = fs.createWriteStream(filepath)
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
            console.log('TAP output written to ' + filename)
            browser.tapWrittenOut = true
            if (callback) callback()
        }.bind(this))
        
    },
    cleanup: function(){}
}

module.exports = AppView