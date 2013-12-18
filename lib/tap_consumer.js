var tap = require('tap')
var yaml = require('js-yaml')
var extend = require('util')._extend
var EventEmitter = require('events').EventEmitter
var log = require('npmlog')

function TapConsumer(socket){
  this.stream = new tap.Consumer
  this.stream.on('data', this.onTapData.bind(this))
  this.stream.on('end', this.onTapEnd.bind(this))
  this.stream.on('bailout', this.onTapError.bind(this))
  this.stack = []
}

TapConsumer.prototype = {
  __proto__: EventEmitter.prototype,
  onTapData: function(data){
    //console.error('onTapData', data)
    if (typeof data === 'string'){
      if (!data.match(/^TAP version [0-9]+\s*$/)){
        this.stack.push(data)
      }
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
      var hasYamlish = data.at || data.stack
      var stack = data.stack
      if (stack) {
        stack = yaml.dump(stack)
      }
      if (!stack){
        stack = this.stack.length > 0 ? this.stack.join('\n') : null
      }
      //console.error(this.messages)
      test.items.push(extend(data, {
        passed: false,
        stack: stack
      }))
      test.failed++
    } else {
      test.passed++
    }
    this.stack = []
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
