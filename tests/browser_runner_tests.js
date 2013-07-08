var BrowserRunner = require('../lib/browser_runner')
var EventEmitter = require('events').EventEmitter
var expect = require('chai').expect
var assert = require('chai').assert
var bd = require('bodydouble')
var stub = bd.stub
var mock = bd.mock

describe('BrowserRunner', function(){
  var socket, runner
  beforeEach(function(){
    socket = new EventEmitter
    runner = new BrowserRunner({
      name: 'Chrome 19.0'
      , socket: socket
    })
  })
  afterEach(function(){
    bd.restoreStubs()
  })
  it('can create', function(){
    expect(runner.get('socket')).to.equal(socket)
  })
  describe('reset Test Results', function(){
    it('resets topLevelError', function(){
      var results = runner.get('results')
      results.set('topLevelError', 'blah')
      results.reset()
      expect(results.get('topLevelError')).to.equal(null)
    })
    it('resets results', function(){
      var results = runner.get('results')
      results.addResult({
        failed: false
        , passed: true
      })
      results.reset()
      expect(results.get('total')).to.equal(0)
      expect(results.get('passed')).to.equal(0)
    })
  })
  it('emits start-tests and resets when startTests', function(){
    var results = runner.get('results')
    stub(results, 'reset')
    stub(socket, 'emit')
    runner.startTests()
    expect(results.reset.callCount).to.equal(1)
    expect(socket.emit.lastCall.args).to.deep.equal(['start-tests'])
  })
  it('sets topLevelError when error emitted', function(){
    socket.emit('top-level-error', 'TypeError: bad news', 'http://test.com/bad.js', 45)
    expect(runner.get('messages').at(0).get('text')).to.equal('TypeError: bad news at http://test.com/bad.js, line 45\n')
  })
  it('emits tests-start on server on tests-start', function(){
    stub(runner, 'trigger')
    socket.emit('tests-start')
    expect(runner.trigger.lastCall.args).to.deep.equal(['tests-start'])
  })
  it('updates results on test-result', function(){
    var results = runner.get('results')
    socket.emit('test-result', {failed: 1})
    expect(results.get('passed')).to.equal(0)
    expect(results.get('failed')).to.equal(1)
    socket.emit('test-result', {failed: 0})
    expect(results.get('passed')).to.equal(1)
    expect(results.get('tests').length).to.equal(2)
  })
  it('sets "all" on all-tests-results', function(){
    socket.emit('all-test-results')
    expect(runner.get('results').get('all')).to.be.ok
  })
})

