var log = require('winston')
var Backbone = require('backbone')
var TestResults = require('./test_results')

var BrowserRunner = Backbone.Model.extend({
  defaults: {
    type: 'browser'
  }
  , initialize: function(){
    this.set({
      messages: new Backbone.Collection
      , results: new TestResults
    }, {silent: true})
    this.registerSocketEvents()
    this.on('change:socket', function(){
      this.previous('socket').removeAllListeners()
      this.registerSocketEvents()
    }, this)
  }
  , registerSocketEvents: function(){
    var self = this
    var results = this.get('results')
    var messages = this.get('messages')
    var socket = this.get('socket')
    socket.on('top-level-error', function(msg, url, line){
      var message = msg + ' at ' + url + ', line ' + line + '\n'
      messages.add({
        type: 'error'
        , text: message
      }, {at: 0})
    })
    socket.on('error', function(message){
      messages.push({
        type: 'error'
        , text: message + '\n'
      })
    })
    socket.on('info', function(message) {
      messages.push({
        type: 'info'
        , text: message + '\n'
        , color: 'green'
      })
    })
    socket.on('warn', function(message){
      messages.push({
        type: 'warn'
        , text: message + '\n'
        , color: 'cyan'
      })
    })
    socket.on('log', function(message){
      messages.push({
        type: 'log'
        , text: message + '\n'
      })
    })
    socket.on('tests-start', function(){
      self.trigger('tests-start')
    })
    socket.on('test-result', function(result){
      results.addResult(result)
      self.trigger('test-result', result)
    })
    socket.on('all-test-results', function(){
      results.set('all', true)
      self.trigger('tests-end')
      self.trigger('all-test-results', results)
    })
    socket.on('disconnect', function(){
      log.info('Client disconnected ' + self.get('name'))
      self.get('results').reset()
      self.get('messages').reset()
      self.trigger('disconnect')
    })
  }
  , startTests: function(){
    this.get('results').reset()
    this.get('socket').emit('start-tests')
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

module.exports = BrowserRunner
