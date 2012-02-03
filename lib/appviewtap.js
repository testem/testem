var log = require('winston')
  , tap = require('tap')

function AppView(app){
    this.app = app
    this.producer = new (tap.Producer)(true)
    this.producer.pipe(process.stdout)
    this.id = 1
}
AppView.prototype = {
    onStartTests: function(){
        
    },
    onBrowsersChanged: function(){
        
    },
    onTestResult: function(result){
        this.producer.write(result.spec)
        
        var entry = {id: this.id++, ok: result.passed}
        var items = result.items.filter(function(item){return !!item})
        
        entry.name = result.spec
        
        if (!result.passed)
            entry.message = items.map(function(item){
                return item.message
            }).join('\n').replace(/:/, ',')
        
        this.producer.write(entry)
    },
    onAllTestResults: function(){
        this.producer.end()
        this.app.quit()
    },
    cleanup: function(){}
}

module.exports = AppView