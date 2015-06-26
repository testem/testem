var TapReporter = require('../../lib/ci/test_reporters/tap_reporter')
var DotReporter = require('../../lib/ci/test_reporters/dot_reporter')
var XUnitReporter = require('../../lib/ci/test_reporters/xunit_reporter')
var PassThrough = require('stream').PassThrough
var XmlDom = require('xmldom')
var assert = require('chai').assert

describe('test reporters', function(){

  describe('tap reporter', function(){
    it('writes out TAP', function(){
      var stream = new PassThrough()
      var reporter = new TapReporter(false, stream)
      reporter.report('phantomjs', {
        name: 'it does stuff',
        passed: 1,
        total: 1,
        failed: 0,
        logs: []
      })
      reporter.report('phantomjs', {
        name: 'it fails',
        passed: 0,
        total: 1,
        failed: 1,
        error: { message: 'it crapped out' },
        logs: ["I am a log", "Useful information"]
      })
      reporter.finish()
      assert.deepEqual(stream.read().toString().split('\n'), [
        'ok 1 phantomjs - it does stuff',
        'not ok 2 phantomjs - it fails',
        '    ---',
        '        message: >',
        '            it crapped out',
        '        Log: >',
        '            I am a log',
        '            Useful information',
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
      var stream = new PassThrough()
      var reporter = new DotReporter(false, stream)
      reporter.report('phantomjs', {
        name: 'it does stuff',
        passed: 1,
        total: 1,
        failed: 0
      })
      reporter.finish()
      var output = stream.read().toString()
      assert.match(output, /  \./)
      assert.match(output, /1 tests complete \([0-9]+ ms\)/)
    })

    it('writes out errors', function(){
      var stream = new PassThrough()
      var reporter = new DotReporter(false, stream)
      reporter.report('phantomjs', {
        name: 'it fails',
        passed: 0,
        total: 1,
        failed: 1,
        error: new Error('it crapped out')
      })
      reporter.finish()
      var output = stream.read().toString()
      assert.match(output, /it fails/)
      assert.match(output, /it crapped out/)
    })
  })

  describe('xunit reporter', function(){
    it('writes out and XML escapes results', function(){
      var stream = new PassThrough()
      var reporter = new XUnitReporter(false, stream)
      reporter.report('phantomjs', {
        name: 'it does <cool> \"cool\" \'cool\' stuff',
        passed: 1,
        total: 1,
        failed: 0
      })
      reporter.finish()
      var output = stream.read().toString()
      assert.match(output, /<testsuite name="Testem Tests" tests="1" failures="0" timestamp="(.+)" time="([0-9]+)">/)
      assert.match(output, /<testcase classname="phantomjs" name="it does &lt;cool> &quot;cool&quot; \'cool\' stuff"/)

      assertXmlIsValid(output)
    })
    it('outputs errors', function(){
      var stream = new PassThrough()
      var reporter = new XUnitReporter(false, stream)
      reporter.report('phantomjs', {
        name: 'it didnt work',
        passed: 0,
        total: 1,
        failed: 1,
        error: new Error('it crapped out')
      })
      reporter.finish()
      var output = stream.read().toString()
      assert.match(output, /it didnt work"/)
      assert.match(output, /it crapped out/)

      assertXmlIsValid(output)
    })
    it('XML escapes errors', function(){
      var stream = new PassThrough()
      var reporter = new XUnitReporter(false, stream)
      reporter.report('phantomjs', {
        name: 'it failed with quotes',
        passed: 0,
        total: 1,
        failed: 1,
        error: new Error('<it> \"crapped\" out')
      })
      reporter.finish()
      var output = stream.read().toString()
      assert.match(output, /it failed with quotes"/)
      assert.match(output, /&lt;it> &quot;crapped&quot; out/)

      assertXmlIsValid(output)
    })
    it('XML escapes messages', function(){
      var stream = new PassThrough()
      var reporter = new XUnitReporter(false, stream)
      reporter.report('phantomjs', {
        name: 'it failed with ampersands',
        passed: 0,
        total: 1,
        failed: 1,
        error: { message: "&&" }
      })
      reporter.finish()
      var output = stream.read().toString()
      assert.match(output, /it failed with ampersands"/)
      assert.match(output, /&amp;&amp;/)

      assertXmlIsValid(output)
    })
    it('presents valid XML with null messages', function(){
      var stream = new PassThrough()
      var reporter = new XUnitReporter(false, stream)
      reporter.report('phantomjs', {
        name: 'null',
        passed: 0,
        total: 1,
        failed: 1,
        error: { message: null }
      })
      reporter.finish()
      var output = stream.read().toString()

      assertXmlIsValid(output)
    })
  })

var assertXmlIsValid = function(xmlString) {
  var failure = null;
  var parser = new XmlDom.DOMParser({
    errorHandler:{
      locator:{},
      warning: function(txt) { failure = txt; },
      error: function(txt) { failure = txt; },
      fatalError: function(txt) { failure = txt; }
    }
  })

  // this will throw into failure variable with invalid xml
  parser.parseFromString(xmlString,'text/xml')

  if (failure)
  {
    assert(false, failure+'\n---\n'+xmlString+'\n---\n')
  }
}

})
