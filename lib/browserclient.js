var log = require('winston')
  , Backbone = require('backbone')

var TestResults = Backbone.Model.extend({
    initialize: function(){
        this.reset()
    }
    , reset: function(){
        this.set({
            topLevelError: null
            , failed: 0
            , passed: 0
            , total: 0
            , tests: new Backbone.Collection()
            , all: false
        })
    }
    , addResult: function(result){
        var total = this.get('total')
          , passed = this.get('passed')
          , failed = this.get('failed')
        total++
        if (result.failed == 0)
            passed++
        else
            failed++
        this.set({
            total: total
            , passed: passed
            , failed: failed
            , items: result.items
        })
        this.get('tests').push(result)
    }
})



var BrowserClient = Backbone.Model.extend({
    initialize: function(client, app){
        this.client = client
        this.app = app
        this.server = this.app.server
        this.set({
            name: null
            , results: new TestResults
            , topLevelError: null
        })
        var self = this
          , server = this.server
          , results = this.get('results')
        
        client.on('error', function(msg, url, line){
            self.set('topLevelError', msg + ' at ' + url + ', line ' + line)
        })
        client.on('browser-login', function(browserName){
            self.set('name', browserName)
            log.info('browser-login ' + browserName)
        })
        client.on('tests-start', function(){
            self.trigger('tests-start')
        })
        client.on('test-result', function(result){
            log.info('got result for ' + self.get('name'))
            results.addResult(result)
        })
        client.on('all-test-results', function(){
            log.info('got all results for ' + self.get('name'))
            results.set('all', true)
            
        })
        client.on('disconnect', function(){
            server.removeBrowser(self)
        })
        
    }
    , startTests: function(){
        log.info('reseting results')
        this.get('results').reset()
        this.client.emit('start-tests')
    }
})



module.exports = BrowserClient