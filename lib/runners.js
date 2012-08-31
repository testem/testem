/*

browserclient.js
================

Model objects (via Backbone) for a browser client (a connection to a browser + the test run session)
and the returned test results for a run of tests.

*/

var log = require('winston')
  , Backbone = require('backbone')
  , tap = require('tap')

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
            , tests: new Backbone.Collection
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

exports.TestResults = TestResults

var BrowserRunner = Backbone.Model.extend({
    defaults: {
        type: 'browser'
    }
    , initialize: function(attrs){
        var client = this.client = attrs.client
        this.app = attrs.app
        this.server = this.app.server
        this.set({
            name: null
            , messages: new Backbone.Collection
            , results: new TestResults
        })
        var self = this
          , server = this.server
          , results = this.get('results')
          , messages = this.get('messages')
        
        client.on('top-level-error', function(msg, url, line){
            var message = msg + ' at ' + url + ', line ' + line
            messages.push({
                type: 'error'
                , text: message
            })
        })
        client.on('error', function(message){
            messages.push({
                type: 'error'
                , text: message
            })
        })
        client.on('warn', function(message){
            messages.push({
                type: 'warn'
                , text: message
            })
        })
        client.on('log', function(message){
            messages.push({
                type: 'log'
                , text: message
            })
        })
        client.on('browser-login', function(browserName){
            self.set('name', browserName)
        })
        client.on('tests-start', function(){
            self.trigger('tests-start')
        })
        client.on('test-result', function(result){
            results.addResult(result)
            self.server.emit('test-result', result)
        })
        client.on('all-test-results', function(){
            results.set('all', true)
            self.trigger('tests-end')
            self.app.emit('all-test-results', results, self)
        })
        client.on('disconnect', function(){
            server.removeBrowser(self)
        })
        
    }
    , startTests: function(){
        this.get('results').reset()
        this.client.emit('start-tests')
    }
    , hasResults: function(){
        var results = this.get('results')
        var total = results.get('total')
        return total > 0
    }
    , hasMessages: function(){
        return this.get('messages').length > 0
    }
})

exports.BrowserRunner = BrowserRunner

var ProcessRunner = Backbone.Model.extend({
    defaults: {
        type: 'process'
    }
    , initialize: function(attrs){
        this.launcher = attrs.launcher
        this.app = attrs.app
        // Assume launcher has already launched
        this.set({
            name: this.launcher.name
            , messages: new Backbone.Collection
            , results: this.isTap() ? new TestResults : null
        })
        
        this.startTests()
    }
    , isTap: function(){
        return this.launcher.settings.protocol === 'tap'
    }
    , hasResults: function(){
        return this.isTap()
    }
    , hasMessages: function(){
        return this.get('messages').length > 0
    }
    , registerProcess: function(process){
        var settings = this.launcher.settings
        var stdout = process.stdout
        var stderr = process.stderr
        var self = this
        if (!settings.hide_stdout){
            stdout.on('data', function(data){
                self.get('messages').push({
                    type: 'log'
                    , text: '' + data
                })
            })
        }
        if (!settings.hide_stderr){
            stderr.on('data', function(data){
                self.get('messages').push({
                    type: 'error'
                    , text: '' + data
                })
            })
        }
        process.on('exit', function(code){
            self.set('allPassed', code === 0)
            self.trigger('tests-end')
        })
        if (this.isTap()){
            this.setupTapConsumer(process)
        }
    }
    , setupTapConsumer: function(process){
        var stdout = process.stdout
        this.message = null
        this.stacktrace = []
        this.tapConsumer = new tap.Consumer
        this.tapConsumer.on('data', this.onTapData.bind(this))
        this.tapConsumer.on('end', this.onTapEnd.bind(this))
        this.tapConsumer.on('bailout', this.onTapError.bind(this))
        stdout.pipe(this.tapConsumer)
    }
    , onTapData: function(data){
        if (typeof data === 'string'){
            if (this.message === null){
                this.message = data
            }else{
                this.stacktrace.push(data)
            }
            return
        }
        var results = this.get('results')

        if (data.id === undefined) {
            return
        }

        var test = {
            passed: 0
            , failed: 0
            , total: 1
            , id: data.id
            , name: data.name.trim()
            , items: []
        }

        if (!data.ok) {
            test.items.push({
                passed: false
                , message: this.message
                , stacktrace: this.stacktrace.join('\n')
            })
            test.failed++
        } else {
            test.passed++
        }
        results.addResult(test)
        this.message = null
        this.stacktrace = []
    }
    , onTapError: function(){
        this.set('results', null)
    }
    , onTapEnd: function(err, testCount){
        var results = this.get('results')
        results.set('all', true)
        this.tapConsumer.removeAllListeners()
        this.tapConsumer = null
        this.app.emit('all-test-results', results)
        this.launcher.kill()
    }
    , startTests: function(){
        var self = this
        if (this.get('results')){
            this.get('results').reset()
        }else{
            this.set('results', this.isTap() ? new TestResults : null)
        }
        this.get('messages').reset([])
        this.set('allPassed', undefined)

        this.launcher.launch(function(process){
            self.registerProcess(process)
            setTimeout(function(){
                self.trigger('tests-start')
            }, 1)
        })
    }
})

exports.ProcessRunner = ProcessRunner

