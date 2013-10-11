var tap = require('tap')
var extend = require('util')._extend
var yaml = require('js-yaml')
var TapConsumer = require('./tap_consumer')

function RunnerTapConsumer(runner){
  this.runner = runner
  var tapConsumer = new TapConsumer
  this.stream = tapConsumer.stream
  tapConsumer.on('test-result', function(test){
    runner.get('results').addResult(test)
  })
  tapConsumer.on('error', function(){
    runner.set('results', null)
  })
  tapConsumer.on('all-test-results', function(){
    runner.get('results').set('all', true)
    tapConsumer.removeAllListeners()
    runner.trigger('all-test-results', this.results)
    runner.trigger('tests-end')
  })
}

module.exports = RunnerTapConsumer