var App = require('../../lib/ci')
var Config = require('../../lib/config')
var path = require('path')
var assert = require('chai').assert
var log = require('winston')
var sinon = require('sinon')

log.remove(log.transports.Console)

describe('ci mode app', function(){

  it('runs them tests', function(done){
    this.timeout(20000)
    var config = new Config('ci', null, {
      port: 7457,
      src_files: [
        'tests/web/*.js'
      ]
    })
    var app = new App(config)
    app.process = {exit: sinon.spy()}
    var reporter = app.reporter = new FakeReporter(function(){
      process.nextTick(checkResults)
    })
    app.start()

    function checkResults(){
      assert(reporter.results.every(function(arg){
        return arg[1].passed
      }), 'all tests passed')
      assert(reporter.results.length >= 1, 'should have a few launchers') // ball park?
      assert(reporter.results.every(function(arg){
        return arg[1].name === 'hello says hello.'
      }), 'have the right test name')
      assert(app.process.exit.called, 'called process.exit()')
      done()
    }
  })

})

function FakeReporter(done){
  this.done = done
  this.results = []
}
FakeReporter.prototype.report = function(){
  this.results.push(Array.prototype.slice.call(arguments))
}
FakeReporter.prototype.finish = function(){
  this.done()
}