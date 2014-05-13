var TapReporter = require('../../lib/ci/test_reporters/tap_reporter')
var DotReporter = require('../../lib/ci/test_reporters/dot_reporter')
var XUnitReporter = require('../../lib/ci/test_reporters/xunit_reporter')
var BufferStream = require('../support/buffer_stream')
var concat = require('concat-stream')
var assert = require('chai').assert

describe('test reporters', function(){

  describe('tap reporter', function(){
    it('writes out TAP', function(){
      var stream = BufferStream()
      var reporter = new TapReporter(false, stream)
      reporter.report('phantomjs', {
        name: 'it does stuff',
        passed: 1,
        total: 1,
        failed: 0
      })
      reporter.report('phantomjs', {
        name: 'it fails',
        passed: 0,
        total: 1,
        failed: 1,
        error: { message: 'it crapped out' }
      })
      reporter.finish()
      assert.deepEqual(stream.lines(), [
        'ok 1 phantomjs - it does stuff',
        'not ok 2 phantomjs - it fails',
        '    ---',
        '        message: >',
        '            it crapped out',
        '    ...',
        '',
        '1..2',
        '# tests 2',
        '# pass  1',
        '# fail  1',
        ''
      ])
    })
  })

  describe('dot reporter', function(){
    it('writes out result', function(){
      var stream = BufferStream()
      var reporter = new DotReporter(false, stream)
      reporter.report('phantomjs', {
        name: 'it does stuff',
        passed: 1,
        total: 1,
        failed: 0
      })
      reporter.finish()
      assert.match(stream.string, /  \./)
      assert.match(stream.string, /1 tests complete \([0-9]+ ms\)/)
    })

    it('writes out errors', function(){
      var stream = BufferStream()
      var reporter = new DotReporter(false, stream)
      reporter.report('phantomjs', {
        name: 'it fails',
        passed: 0,
        total: 1,
        failed: 1,
        error: new Error('it crapped out')
      })
      reporter.finish()
      assert.match(stream.string, /it fails/)
      assert.match(stream.string, /it crapped out/)
    })
  })

  describe('xunit reporter', function(){
    it('writes out and XML escapes results', function(){
      var stream = BufferStream()
      var reporter = new XUnitReporter(false, stream)
      reporter.report('phantomjs', {
        name: 'it does <cool> \"cool\" \'cool\' stuff',
        passed: 1,
        total: 1,
        failed: 0
      })
      reporter.finish()
      assert.match(stream.string, /<testsuite name="Testem Tests" tests="1" failures="0" timestamp="(.+)" time="([0-9]+)">/)
      assert.match(stream.string, /<testcase name="phantomjs it does &lt;cool&gt; &quot;cool&quot; &apos;cool&apos; stuff"\/>/)
    })
    it('outputs errors', function(){
      var stream = BufferStream()
      var reporter = new XUnitReporter(false, stream)
      reporter.report('phantomjs', {
        name: 'it didnt work',
        passed: 1,
        total: 1,
        failed: 0,
        error: new Error('it crapped out')
      })
      reporter.finish()
      assert.match(stream.string, /it didnt work"><failure/)
      assert.match(stream.string, /it crapped out/)
      
    })
  })

})