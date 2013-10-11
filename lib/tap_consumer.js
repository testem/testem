var tap = require('tap')
var yaml = require('js-yaml')
var extend = require('util')._extend
var EventEmitter = require('events').EventEmitter

function TapConsumer(socket){
  this.stream = new tap.Consumer
  this.stream.on('data', this.onTapData.bind(this))
  this.stream.on('end', this.onTapEnd.bind(this))
  this.stream.on('bailout', this.onTapError.bind(this))
}

TapConsumer.prototype = {
  __proto__: EventEmitter.prototype,
  onTapData: function(data){
    if (typeof data === 'string'){
      return
    }
    if (data.skip){
      return
    }

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
    this.emit('test-result', test)
  },
  onTapError: function(msg){
    this.emit('all-test-results')
  },
  onTapEnd: function(err, testCount){
    this.stream.removeAllListeners()
    this.emit('all-test-results')
  }
}

module.exports = TapConsumer
