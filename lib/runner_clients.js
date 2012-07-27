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

exports.TestResults = TestResults

var BrowserClient = Backbone.Model.extend({
    defaults: {
        type: 'browser'
    }
    , initialize: function(attrs){
        var client = this.client = attrs.client
        this.app = attrs.app
        this.server = this.app.server
        this.set({
            name: null
            , results: new TestResults
        })
        var self = this
          , server = this.server
          , results = this.get('results')
        
        client.on('error', function(msg, url, line){
            results.set('topLevelError', msg + ' at ' + url + ', line ' + line)
        })
        client.on('browser-login', function(browserName){
            self.set('name', browserName)
            log.info('browser-login ' + browserName)
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
            self.server.emit('all-test-results', results, self)
        })
        client.on('disconnect', function(){
            server.removeBrowser(self)
        })
        
    }
    , startTests: function(){
        this.get('results').reset()
        this.client.emit('start-tests')
    }
})

exports.BrowserClient = BrowserClient

var ProcessClient = Backbone.Model.extend({
    defaults: {
        type: 'process'
    }
    , initialize: function(attrs){
        this.launcher = attrs.launcher
        // Assume launcher has already launched
        this.set({
            name: this.launcher.name
            , logOutputChunks: new Backbone.Collection
            , results: new TestResults
        })
        
        this.startTests()
    }
    , registerProcess: function(){
        var process = this.launcher.process
        var stdout = process.stdout
        var stderr = process.stderr
        var self = this
        stdout.on('data', function(data){
            data.toString().split(/\r?\n/).forEach(function(line){
                if (line.trim().length > 0){
                    self.get('logOutputChunks').push({
                        source: 'stdout'
                        , text: line
                    })
                }
            })
        })
        stderr.on('data', function(data){
            log.info('stderr: ' + data)
            data.toString().split(/\r?\n/).forEach(function(line){
                if (line.trim().length > 0){
                    self.get('logOutputChunks').push({
                        source: 'stderr'
                        , text: line
                    })
                }
            })
        })
        process.on('exit', function(code){
            self.set('allPassed', code === 0)
            self.trigger('tests-end')
        })

        this.tapConsumer = new tap.Consumer
        this.tapConsumer.on('data', this.onTapData.bind(this))
        this.tapConsumer.on('end', this.onTapEnd.bind(this))
        this.tapConsumer.on('bailout', this.onTapError.bind(this))
        stdout.pipe(this.tapConsumer)
    }
    , onTapData: function(data){
        if (typeof data === 'string') return
        log.info('onTapData: ' + data)
        try{
            var results = this.get('results')

            if (data.id === undefined) {
                return
            }

            var test = {
                passed: 0
                , failed: 0
                , total: 1
                , id: data.id
                , name: data.name
                , items: []
            }

            if (!data.ok) {
                test.items.push({
                    passed: false
                    , message: data.name
                    , stacktrace: data.stack && data.stack.join("\n")
                })
                test.failed++
            } else {
                test.passed++
            }

            results.addResult(test)
        }catch(e){
            log.error(e.message)
            log.error(e.stack)
        }
    }
    , onTapError: function(){
        log.info('tap parser bailing out')
        this.set('results', null)
    }
    , onTapEnd: function(err, testCount){
        log.info('onTapEnd, testCount: ' + testCount)
        var results = this.get('results')
        results.set('all', true)
        this.tapConsumer.removeAllListeners()
        this.tapConsumer = null
    }
    , startTests: function(){
        var self = this
        if (this.get('results')){
            this.get('results').reset()
        }else{
            this.set('results', new TestResults)
        }
        this.get('logOutputChunks').reset([])
        this.set('allPassed', undefined)
        this.launcher.launch()
        this.registerProcess()
        setTimeout(function(){
            self.trigger('tests-start')
        }, 1)
    }
})

exports.ProcessClient = ProcessClient

