var TapReporter = require('../../lib/reporters/tap_reporter');
var DotReporter = require('../../lib/reporters/dot_reporter');
var XUnitReporter = require('../../lib/reporters/xunit_reporter');
var TeamcityReporter = require('../../lib/reporters/teamcity_reporter');
var Config = require('../../lib/config');
var PassThrough = require('stream').PassThrough;
var XmlDom = require('xmldom');
var assert = require('chai').assert;
var assertXmlIsValid = function(xmlString) {
  var failure = null;
  var parser = new XmlDom.DOMParser({
    errorHandler:{
      locator:{},
      warning: function(txt) { failure = txt; },
      error: function(txt) { failure = txt; },
      fatalError: function(txt) { failure = txt; }
    }
  });

  // this will throw into failure variable with invalid xml
  parser.parseFromString(xmlString, 'text/xml');

  if (failure)
  {
    assert(false, failure + '\n---\n' + xmlString + '\n---\n');
  }
};

describe('test reporters', function() {

  describe('tap reporter', function() {
    context('without errors', function() {
      it('writes out TAP', function() {
        var stream = new PassThrough();
        var reporter = new TapReporter(false, stream);
        reporter.report('phantomjs', {
          name: 'it does stuff',
          passed: true,
          logs: []
        });
        reporter.report('phantomjs', {
          name: 'it is skipped',
          skipped: true,
          logs: []
        });
        reporter.finish();
        assert.deepEqual(stream.read().toString().split('\n'), [
          'ok 1 phantomjs - it does stuff',
          'skip 2 phantomjs - it is skipped',
          '',
          '1..2',
          '# tests 2',
          '# pass  1',
          '# skip  1',
          '# fail  0',
          '',
          '# ok',
          ''
        ]);
      });
    });

    context('with errors', function() {
      it('writes out TAP with failure info', function() {
        var stream = new PassThrough();
        var reporter = new TapReporter(false, stream);
        reporter.report('phantomjs', {
          name: 'it does stuff',
          passed: true,
          logs: []
        });
        reporter.report('phantomjs', {
          name: 'it fails',
          passed: false,
          error: { message: 'it crapped out' },
          logs: ['I am a log', 'Useful information']
        });
        reporter.report('phantomjs', {
          name: 'it is skipped',
          skipped: true,
          logs: []
        });
        reporter.finish();
        assert.deepEqual(stream.read().toString().split('\n'), [
          'ok 1 phantomjs - it does stuff',
          'not ok 2 phantomjs - it fails',
          '    ---',
          '        message: >',
          '            it crapped out',
          '        Log: |',
          '            \'I am a log\'',
          '            \'Useful information\'',
          '    ...',
          'skip 3 phantomjs - it is skipped',
          '',
          '1..3',
          '# tests 3',
          '# pass  1',
          '# skip  1',
          '# fail  1',
          ''
        ]);
      });
    });

    context('without name', function() {
      it('writes out TAP', function() {
        var stream = new PassThrough();
        var reporter = new TapReporter(false, stream);
        reporter.report('phantomjs', {
          passed: true,
          logs: []
        });
        reporter.finish();
        assert.deepEqual(stream.read().toString().split('\n'), [
          'ok 1 phantomjs',
          '',
          '1..1',
          '# tests 1',
          '# pass  1',
          '# skip  0',
          '# fail  0',
          '',
          '# ok',
          ''
        ]);
      });
    });
  });

  describe('dot reporter', function() {
    context('without errors', function() {
      it('writes out summary', function() {
        var stream = new PassThrough();
        var reporter = new DotReporter(false, stream);
        reporter.report('phantomjs', {
          name: 'it does stuff',
          passed: true,
          logs: []
        });
        reporter.finish();
        var output = stream.read().toString();
        assert.match(output, /  \.\n\n/);
        assert.match(output, /1 tests complete \([0-9]+ ms\)/);
      });
    });

    context('with errors', function() {
      it('writes out summary with failure info', function() {
        var stream = new PassThrough();
        var reporter = new DotReporter(false, stream);
        reporter.report('phantomjs', {
          name: 'it fails',
          passed: false,
          error: {
            actual: 'Seven',
            expected: 7,
            message: 'This should be a number',
            stack: 'trace'
          }
        });
        reporter.finish();
        var output = stream.read().toString().split('\n');

        output.shift();
        assert.match(output.shift(), /  F/);
        output.shift();
        assert.match(output.shift(), /  1 tests complete \(\d+ ms\)/);
        output.shift();
        assert.match(output.shift(), /  1\) \[phantomjs\] it fails/);
        assert.match(output.shift(), /     This should be a number/);
        output.shift();
        assert.match(output.shift(), /     expected: 7/);
        assert.match(output.shift(), /       actual: 'Seven'/);
        output.shift();
        assert.match(output.shift(), /     trace/);
        assert.equal(output, '');
      });
    });

    context('with skipped', function() {
      it('writes out summary', function() {
        var stream = new PassThrough();
        var reporter = new DotReporter(false, stream);
        reporter.report('phantomjs', {
          name: 'it does stuff',
          skipped: true,
          logs: []
        });
        reporter.finish();
        var output = stream.read().toString();
        assert.match(output, /  \*/);
        assert.match(output, /1 tests complete \([0-9]+ ms\)/);
      });
    });
  });

  describe('xunit reporter', function() {
    var config, stream;

    beforeEach(function() {
      config = new Config('ci', {
        xunit_intermediate_output: false,
      });
      stream = new PassThrough();
    });

    it('writes out and XML escapes results', function() {
      var reporter = new XUnitReporter(false, stream, config);
      reporter.report('phantomjs', {
        name: 'it does <cool> \"cool\" \'cool\' stuff',
        passed: true
      });
      reporter.finish();
      var output = stream.read().toString();
      assert.match(output, /<testsuite name="Testem Tests" tests="1" skipped="0" failures="0" timestamp="(.+)" time="(\d+(\.\d+)?)">/);
      assert.match(output, /<testcase classname="phantomjs" name="it does &lt;cool> &quot;cool&quot; \'cool\' stuff"/);

      assertXmlIsValid(output);
    });

    it('uses stdout to print intermediate test results when intermediate output is enabled', function() {
      config.set('xunit_intermediate_output', true);
      var reporter = new XUnitReporter(false, stream, config);
      var displayed = false;
      var write = process.stdout.write;
      process.stdout.write = function(string, encoding, fd) {
        write.apply(process.stdout, [string, encoding, fd]);
        displayed = true;
      };
      reporter.report('phantomjs', {
        name: 'it does stuff',
        passed: true,
        logs: []
      });
      assert(displayed);
      process.stdout.write = write;
    });

    it('does not print intermediate test results when intermediate output is disabled', function() {
      var reporter = new XUnitReporter(false, stream, config);
      var displayed = false;
      var write = process.stdout.write;
      process.stdout.write = function(string, encoding, fd) {
        write.apply(process.stdout, [string, encoding, fd]);
        displayed = true;
      };
      reporter.report('phantomjs', {
        name: 'it does stuff',
        passed: true,
        logs: []
      });
      assert(!displayed);
      process.stdout.write = write;
    });

    it('outputs errors', function() {
      var reporter = new XUnitReporter(false, stream, config);
      reporter.report('phantomjs', {
        name: 'it didnt work',
        passed: false,
        error: {
          message: (new Error('it crapped out')).stack
        }
      });
      reporter.finish();
      var output = stream.read().toString();
      assert.match(output, /it didnt work"/);
      assert.match(output, /it crapped out/);

      assertXmlIsValid(output);
    });

    it('outputs skipped tests', function() {
      var reporter = new XUnitReporter(false, stream, config);
      reporter.report('phantomjs', {
        name: 'it didnt work',
        passed: false,
        skipped: true
      });
      reporter.finish();
      var output = stream.read().toString();
      assert.match(output, /<skipped\/>/);

      assertXmlIsValid(output);
    });

    it('XML escapes errors', function() {
      var reporter = new XUnitReporter(false, stream, config);
      reporter.report('phantomjs', {
        name: 'it failed with quotes',
        passed: false,
        error: {
          message: (new Error('<it> \"crapped\" out')).stack
        }
      });
      reporter.finish();
      var output = stream.read().toString();
      assert.match(output, /it failed with quotes"/);
      assert.match(output, /&lt;it> &quot;crapped&quot; out/);

      assertXmlIsValid(output);
    });

    it('XML escapes messages', function() {
      var reporter = new XUnitReporter(false, stream, config);
      reporter.report('phantomjs', {
        name: 'it failed with ampersands',
        passed: false,
        error: { message: '&&' }
      });
      reporter.finish();
      var output = stream.read().toString();
      assert.match(output, /it failed with ampersands"/);
      assert.match(output, /&amp;&amp;/);

      assertXmlIsValid(output);
    });

    it('presents valid XML with null messages', function() {
      var reporter = new XUnitReporter(false, stream, config);
      reporter.report('phantomjs', {
        name: 'null',
        passed: false,
        error: { message: null }
      });
      reporter.finish();
      var output = stream.read().toString();

      assertXmlIsValid(output);
    });
  });

  describe('teamcity reporter', function() {
    var stream;

    beforeEach(function() {
      stream = new PassThrough();
    });

    it('writes out and XML escapes results', function() {
      var reporter = new TeamcityReporter(false, stream);
      reporter.report('phantomjs', {
        name: 'it does <cool> \"cool\" \'cool\' stuff',
        passed: true
      });
      reporter.report('phantomjs', {
        name: 'it skips stuff',
        skipped: true
      });
      reporter.finish();
      var output = stream.read().toString();

      assert.match(output, /##teamcity\[testSuiteFinished name='mocha\.suite' duration='(\d+(\.\d+)?)'\]/);
      assert.match(output, /##teamcity\[testStarted name='phantomjs - it does <cool> "cool" \|'cool\|' stuff']/);
      assert.match(output, /##teamcity\[testIgnored name='phantomjs - it skips stuff' message='pending']/);
    });
  });
});
