var ProcessRunner = require('../lib/process_runner')
var sinon = require('sinon')
var expect = require('chai').expect
var assert = require('chai').assert
var BufferStream = require('bufferstream')

describe('ProcessRunner', function(){
  var runner
  var onStdoutData
  var onStderrData
  var launcher
  var settings
  var process

  describe('bare process', function(){

    beforeEach(function(){
      settings = { protocol: 'process' }
      process = {
        on: function(){}
        , stdout: {
          on: function(evt, cb){
            if (evt === 'data')
              onStdoutData = cb
          }
        }
        , stderr: {
          on: function(evt, cb){
            if (evt === 'data')
              onStderrData = cb
          }
        }
      }
      launcher = {
        settings: settings
        , process: process
        , launch: function(cb){
          cb(process)
        }
      }
      runner = new ProcessRunner({
        launcher: launcher
      })
    })
    it('should instantiate', function(){
    })
    it('should return whether is tap', function(){
      settings.protocol = 'tap'
      expect(runner.isTap()).to.be.ok
      delete settings.protocol
      expect(runner.isTap()).not.to.be.ok
    })
    it('should have results if tap', function(){
      sinon.stub(runner, 'isTap').returns(true)
      expect(runner.hasResults()).to.be.ok
      runner.isTap.returns(false)
      expect(runner.hasResults()).not.to.be.ok
    })
    it('initially has 0 messages', function(){
      expect(runner.get('messages').length).to.equal(0)
    })
    it('hasMessages if messages has length > 0', function(){
      expect(runner.hasMessages()).not.to.be.ok
      runner.get('messages').push({})
      expect(runner.hasMessages()).to.be.ok
    })
    it('reads stdout into messages', function(){
      onStdoutData('foobar')
      expect(runner.get('messages').length).to.equal(1)
      var message = runner.get('messages').at(0)
      expect(message.get('type')).to.equal('log')
      expect(message.get('text')).to.equal('foobar')
    })
    it('reads stderr into messages', function(){
      onStderrData('foobar')
      expect(runner.get('messages').length).to.equal(1)
      var message = runner.get('messages').at(0)
      expect(message.get('type')).to.equal('error')
      expect(message.get('text')).to.equal('foobar')
    })
    it('should have results object be undefined', function(){
      expect(runner.get('results')).to.equal(null)
    })
  })

  describe('tap', function(){
    var stdout
    beforeEach(function(){
      settings = { protocol: 'tap' }
      stdout = new BufferStream([{encoding:'utf8', size:'none'}])
      process = {
        on: function(){}
        , stdout: stdout
        , stderr: {
          on: function(evt, cb){
            if (evt === 'data')
              onStderrData = cb
          }
        }
      }
      launcher = {
        settings: settings
        , process: process
        , launch: function(cb){
          cb(process)
        }
        , kill: function(){}
      }
      runner = new ProcessRunner({
        launcher: launcher
      })
    })
    it('should have a results object', function(){
      expect(runner.get('results')).not.to.equal(null)
    })
    it('reads tap into testresult object', function(){
      settings.protocol = 'tap'
      var tapOutput = '1..1\nok 1 foobar that'
      stdout.end(tapOutput)
      var results = runner.get('results')
      var total = results.get('total')
      var pass = results.get('passed')
      var fail = results.get('failed')
      expect(pass).to.equal(1)
      expect(total).to.equal(1)
      expect(fail).to.equal(0)
    })


  })

})
