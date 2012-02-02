var log = require('winston')
  , tap = require('tap')

function AppView(app){
    this.app = app
    this.producer = new (tap.Producer)()
}
AppView.prototype = {
    onStartTests: function(){
        
    },
    onBrowsersChanged: function(){
        
    },
    onTestResult: function(){
        
    },
    onAllTestResults: function(){
        
    },
    cleanup: function(){}
}

module.exports = AppView