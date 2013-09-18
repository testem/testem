/*

browserclient.js
================

Model objects (via Backbone) for a browser client (a connection to a browser + the test run session)
and the returned test results for a run of tests.

*/

var log = require('winston')
var Backbone = require('backbone')
var tap = require('tap')
var extend = require('util')._extend
var TestResults = require('./test_results')
var yaml = require('js-yaml')

var ProcessRunner = Backbone.Model.extend({
  defaults: {
    type: 'process'
  }
  , initialize: function(attrs){
    this.launcher = attrs.launcher
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
    this.tapConsumer = new tap.Consumer
    this.tapConsumer.on('data', this.onTapData.bind(this))
    this.tapConsumer.on('end', this.onTapEnd.bind(this))
    this.tapConsumer.on('bailout', this.onTapError.bind(this))
    stdout.pipe(this.tapConsumer)
  }
  , onTapData: function(data){
    if (typeof data === 'string'){
      return
    }
    if (data.skip){
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
      var stack = data.stack

      if (stack) { 
        if (Array.isArray(stack)) {
          stack = stack.join("\n")
        } else {
          stack = yaml.dump(stack)
        }
      }
          
      test.items.push(extend(data, {
        passed: false
        , message: this.message
        , stack: stack
      }))
      test.failed++
    } else {
      test.passed++
    }
    results.addResult(test)
    this.message = null
  }
  , onTapError: function(){
    this.set('results', null)
  }
  , onTapEnd: function(err, testCount){
    var results = this.get('results')
    results.set('all', true)
    this.tapConsumer.removeAllListeners()
    this.tapConsumer = null
    this.trigger('all-test-results', this.get('results'))
    this.trigger('tests-end')
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

module.exports = ProcessRunner
