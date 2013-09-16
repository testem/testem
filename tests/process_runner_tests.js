var ProcessRunner = require('../lib/process_runner')
var expect = require('chai').expect
var assert = require('chai').assert
var child_process = require('child_process')
var BufferStream = require('./support/buffer_stream')
var Launcher = require('../lib/launcher')
var bd = require('bodydouble')
var stub = bd.stub

describe('ProcessRunner', function(){
  var runner
  var launcher
  var settings
  var process

  describe('bare process', function(){

    beforeEach(function(){
      settings = { protocol: 'process' }
      process = FakeProcess()
      launcher = new Launcher('launcher', settings)
      launcher.process = process
      bd.stub(launcher, 'launch').delegatesTo(function(cb){
        cb(process)
      })
      runner = new ProcessRunner({
        launcher: launcher
      })
    })
    it('should not be tap', function(){
      expect(runner.isTap()).not.to.be.ok
    })
    it('should not have results', function(){
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
      process.stdout.write('foobar')
      expect(runner.get('messages').length).to.equal(1)
      var message = runner.get('messages').at(0)
      expect(message.get('type')).to.equal('log')
      expect(message.get('text')).to.equal('foobar')
    })
    it('reads stderr into messages', function(){
      process.stderr.write('foobar')
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
    beforeEach(function(){
      process = FakeProcess()
      launcher = new Launcher('launcher', { protocol: 'tap' })
      launcher.process = process
      bd.stub(launcher, 'launch').delegatesTo(function(cb){
        cb(process)
      })
      runner = new ProcessRunner({
        launcher: launcher
      })
    })
    it('should is tap', function(){
      expect(runner.isTap()).to.be.ok
    })
    it('should have results', function(){
      expect(runner.hasResults()).to.be.ok
    })
    it('should have a results object', function(){
      expect(runner.get('results')).not.to.equal(null)
    })
    it('reads tap into testresult object', function(done){
      var tapOutput = '1..1\nok 1 foobar that'
      process.stdout.end(tapOutput)
      setTimeout(function(){
        var results = runner.get('results')
        var total = results.get('total')
        var pass = results.get('passed')
        var fail = results.get('failed')
        expect(pass).to.equal(1)
        expect(total).to.equal(1)
        expect(fail).to.equal(0)
        done()
      }, 0)
    })
    
  })

})

function FakeProcess(){
  var p = bd.mock(child_process.exec(''))
  p.stdout = BufferStream()
  p.stderr = BufferStream()
  return p
}