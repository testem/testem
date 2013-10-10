var tap = require('tap')
var extend = require('util')._extend
var yaml = require('js-yaml')

function TapConsumer(runner){
  this.runner = runner
  var tapConsumer = this.tapConsumer = new tap.Consumer
  tapConsumer.on('data', this.onTapData.bind(this))
  tapConsumer.on('end', this.onTapEnd.bind(this))
  tapConsumer.on('bailout', this.onTapError.bind(this))
}
TapConsumer.prototype = {
  write: function(msg){
    this.tapConsumer.write(msg)
  },
  end: function(){
    this.tapConsumer.end()
  },
  readFrom: function(stream){
    stream.pipe(this.tapConsumer)
  },
  results: function(){
    return this.runner.get('results')
  },
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
    this.results().addResult(test)
    this.message = null
  },
  onTapError: function(){
    this.runner.set('results', null)
  },
  onTapEnd: function(err, testCount){
    this.results().set('all', true)
    this.tapConsumer.removeAllListeners()
    this.tapConsumer = null
    this.runner.trigger('all-test-results', this.results)
    this.runner.trigger('tests-end')
  }
}

module.exports = TapConsumer