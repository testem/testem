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
        with(this.client){
            on('error', function(msg, url, line){
                self.set('topLevelError', msg + ' at ' + url + ', line ' + line)
            })
            on('browser-login', function(browserName){
                self.set('name', browserName)
            })
            on('tests-start', function(){
                server.emit('test-start')
            })
            on('test-result', function(result){
                results.addResult(result)
                server.emit('test-result', result, this)
            })
            on('all-test-results', function(){
                results.set('all', true)
            })
            on('disconnect', function(){
                server.removeBrowser(self)
            })
        }
        this.startTests()
        this.startTests() // do it twices for good measure
    }
    , startTests: function(){
        this.get('results').reset()
        this.client.emit('start-tests')
    }
})



module.exports = BrowserClient