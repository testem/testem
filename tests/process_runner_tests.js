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
    it('reads tap', function(done){
      var tap = [
        'TAP version 13',
        '# hello says hello',
        'ok 1 hello() should be "hello world"',
        '# hello says hello to bob',
        'ok 2 hello(bob) should be "hello bob"',
        '',
        '1..2',
        '# tests 2',
        '# pass  2',
        '',
        '# ok'
      ].join('\n')
      process.stdout.end(tap)
      setTimeout(function(){
        var results = runner.get('results')
        var total = results.get('total')
        var pass = results.get('passed')
        var fail = results.get('failed')
        expect(pass).to.equal(2)
        expect(total).to.equal(2)
        expect(fail).to.equal(0)
        var tests = results.get('tests')
        expect(tests.length).to.equal(2)
        expect(tests.at(0).get('name')).to.equal('hello() should be "hello world"')
        expect(tests.at(1).get('name')).to.equal('hello(bob) should be "hello bob"')
        done()
      }, 0)
    })
    it('read tap with failing test case', function(done){
      var tap = [
        'TAP version 13',
        '# hello says hello',
        'not ok 1 hello() should be "hello world"',
        '  ---',
        '    operator: equal',
        '    expected: "hell world"',
        '    actual:   "hello world"',
        '    at: Test._cb (/Users/david/git/testem/examples/tape_example/tests.js:6:7)',
        '  ...',
        '# hello says hello to bob',
        'ok 2 hello(bob) should be "hello bob"',
        ' ',
        '1..2',
        '# tests 2',
        '# pass  1',
        '# fail  1'
      ].join('\n')
      process.stdout.end(tap)
      setTimeout(function(){
        var results = runner.get('results')
        var total = results.get('total')
        var pass = results.get('passed')
        var fail = results.get('failed')
        expect(pass).to.equal(1)
        expect(total).to.equal(2)
        expect(fail).to.equal(1)
        var tests = results.get('tests')
        expect(tests.length).to.equal(2)
        expect(tests.at(0).get('name')).to.equal('hello() should be "hello world"')
        expect(tests.at(1).get('name')).to.equal('hello(bob) should be "hello bob"')
        var failItems = tests.at(0).get('items')
        
        // this tests for case documented in <https://github.com/airportyh/testem/issues/291>
        expect(failItems[0].message).to.equal(null)
        expect(failItems[0].operator).to.equal('equal')
        expect(failItems[0].expected).to.equal('"hell world"')
        expect(failItems[0].actual).to.equal('"hello world"')
        expect(failItems[0].at).to.equal('Test._cb (/Users/david/git/testem/examples/tape_example/tests.js:6:7)')
        done()
      }, 0)
    })

    it('reads tape output with a stacktrace', function(done){
      var tap = [
        'TAP version 13',
        '# hello says hello',
        'ok 1 hello() should be "hello world"',
        '# hello says hello to bob',
        'not ok 2 Error: blah',
        '  ---',
        '    operator: error',
        '    expected: ',
        '    actual:   {}',
        '    stack:',
        '      Error: blah',
        '        at Test._cb (/Users/airportyh/Home/Code/testem/examples/tape_example/tests.js:11:11)',
        '        at Test.run (/Users/airportyh/Home/Code/testem/examples/tape_example/node_modules/tape/lib/test.js:52:14)',
        '        at Test.<anonymous> (/Users/airportyh/Home/Code/testem/examples/tape_example/node_modules/tape/lib/results.js:108:24)',
        '        at Test.g (events.js:175:14)',
        '        at Test.EventEmitter.emit (events.js:92:17)',
        '        at Test.end (/Users/airportyh/Home/Code/testem/examples/tape_example/node_modules/tape/lib/test.js:85:27)',
        '        at Object._onImmediate (/Users/airportyh/Home/Code/testem/examples/tape_example/node_modules/tape/lib/test.js:163:35)',
        '        at processImmediate [as _immediateCallback] (timers.js:330:15)',
        '  ...',
        '',
        '1..2',
        '# tests 2',
        '# pass  0',
        '# fail  2'
      ].join('\n')
      process.stdout.end(tap)
      setTimeout(function(){
        var results = runner.get('results')
        expect(results.get('total')).to.equal(2)
        expect(results.get('passed')).to.equal(1)
        expect(results.get('failed')).to.equal(1)
        var tests = results.get('tests')
        var failingTest = tests.at(1)
        var failingItems = failingTest.get('items')
        var stack = failingItems[0].stack
        expect(typeof stack).to.equal('string')
        expect(stack).to.match(/Error\:/)
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