'use strict';

const CurrentTime = require('../../lib/utils/current-time');
var TapReporter = require('../../lib/reporters/tap_reporter');
var DotReporter = require('../../lib/reporters/dot_reporter');
var XUnitReporter = require('../../lib/reporters/xunit_reporter');
var TeamcityReporter = require('../../lib/reporters/teamcity_reporter');
var Config = require('../../lib/config');
var PassThrough = require('stream').PassThrough;
var XmlDom = require('@xmldom/xmldom');
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
    var config, stream;
    let originalTimeFn;
    let expectedTimeStrings;

    beforeEach(function() {
      stream = new PassThrough();
      originalTimeFn = CurrentTime.asLocaleTimeString;
      expectedTimeStrings = [];

      CurrentTime.asLocaleTimeString = () => {
        let timeString = originalTimeFn();

        expectedTimeStrings.push(timeString);

        return timeString;
      };
    });

    afterEach(function() {
      CurrentTime.asLocaleTimeString = originalTimeFn;
    });

    context('with default configuration', function() {
      beforeEach(function() {
        config = new Config('ci', {});
      });

      context('without errors', function() {
        it('writes out TAP', function() {
          var reporter = new TapReporter(false, stream, config);
          reporter.report('phantomjs', {
            name: 'it does stuff',
            passed: true,
            logs: ['some log'],
            runDuration: 3,
          });
          reporter.report('phantomjs', {
            name: 'it is skipped',
            skipped: true,
            logs: [],
            runDuration: 0,
          });
          reporter.finish();
          assert.deepEqual(stream.read().toString().split('\n'), [
            'ok 1 phantomjs - [3 ms] - it does stuff',
            '    ---',
            '        browser log: |',
            '            some log',
            '    ...',
            'skip 2 phantomjs - [0 ms] - it is skipped',
            '',
            '1..2',
            '# tests 2',
            '# pass  1',
            '# skip  1',
            '# todo  0',
            '# fail  0',
            '',
            '# ok',
            ''
          ]);
        });
      });

      context('with errors', function() {
        it('writes out TAP with failure info', function() {
          var reporter = new TapReporter(false, stream, config);
          reporter.report('phantomjs', {
            name: 'it does stuff',
            passed: true,
            logs: ['some log'],
            runDuration: 3,
          });
          reporter.report('phantomjs', {
            name: 'it fails',
            passed: false,
            error: { message: 'it crapped out' },
            logs: ['I am a log', 'Useful information'],
            runDuration: 5,
          });
          reporter.report('phantomjs', {
            name: 'it is skipped',
            skipped: true,
            logs: [],
            runDuration: 0,
          });
          reporter.finish();
          assert.deepEqual(stream.read().toString().split('\n'), [
            'ok 1 phantomjs - [3 ms] - it does stuff',
            '    ---',
            '        browser log: |',
            '            some log',
            '    ...',
            'not ok 2 phantomjs - [5 ms] - it fails',
            '    ---',
            '        message: >',
            '            it crapped out',
            '        browser log: |',
            '            I am a log',
            '            Useful information',
            '    ...',
            'skip 3 phantomjs - [0 ms] - it is skipped',
            '',
            '1..3',
            '# tests 3',
            '# pass  1',
            '# skip  1',
            '# todo  0',
            '# fail  1',
            ''
          ]);
        });
      });
    });

    context('with quiet logs', function() {
      beforeEach(function() {
        config = new Config('ci', { tap_quiet_logs: true });
      });

      context('without errors', function() {
        it('writes out TAP', function() {
          var reporter = new TapReporter(false, stream, config);
          reporter.report('phantomjs', {
            name: 'it does stuff',
            passed: true,
            logs: ['some log'],
            runDuration: 3,
          });
          reporter.report('phantomjs', {
            name: 'it is skipped',
            skipped: true,
            logs: [],
            runDuration: 0,
          });
          reporter.finish();
          assert.deepEqual(stream.read().toString().split('\n'), [
            'ok 1 phantomjs - [3 ms] - it does stuff',
            'skip 2 phantomjs - [0 ms] - it is skipped',
            '',
            '1..2',
            '# tests 2',
            '# pass  1',
            '# skip  1',
            '# todo  0',
            '# fail  0',
            '',
            '# ok',
            ''
          ]);
        });
      });

      context('with errors', function() {
        it('writes out TAP with failure info', function() {
          var reporter = new TapReporter(false, stream, config);
          reporter.report('phantomjs', {
            name: 'it does stuff',
            passed: true,
            logs: ['some log'],
            runDuration: 50,
          });
          reporter.report('phantomjs', {
            name: 'it fails',
            passed: false,
            error: { message: 'it crapped out' },
            logs: ['I am a log', 'Useful information'],
            runDuration: 5,
          });
          reporter.report('phantomjs', {
            name: 'it is skipped',
            skipped: true,
            logs: [],
            runDuration: 0,
          });
          reporter.finish();
          assert.deepEqual(stream.read().toString().split('\n'), [
            'ok 1 phantomjs - [50 ms] - it does stuff',
            'not ok 2 phantomjs - [5 ms] - it fails',
            '    ---',
            '        message: >',
            '            it crapped out',
            '        browser log: |',
            '            I am a log',
            '            Useful information',
            '    ...',
            'skip 3 phantomjs - [0 ms] - it is skipped',
            '',
            '1..3',
            '# tests 3',
            '# pass  1',
            '# skip  1',
            '# todo  0',
            '# fail  1',
            ''
          ]);
        });
      });

      context('with todos', function() {
        it('writes out TAP with failure info', function() {
          var reporter = new TapReporter(false, stream, config);
          reporter.report('phantomjs', {
            name: 'it is a failing todo',
            passed: false,
            todo: true,
            error: { message: 'it crapped out' },
            logs: ['I am a log', 'Useful information'],
            runDuration: 5,
          });
          reporter.report('phantomjs', {
            name: 'it is a passing todo',
            passed: true,
            todo: true,
            error: { message: 'expected todo to not pass' },
            logs: ['I am a log', 'Useful information'],
            runDuration: 5,
          });
          reporter.finish();
          assert.deepEqual(stream.read().toString().split('\n'), [
            'todo 1 phantomjs - [5 ms] - it is a failing todo',
            '    ---',
            '        message: >',
            '            it crapped out',
            '        browser log: |',
            '            I am a log',
            '            Useful information',
            '    ...',
            'not ok 2 phantomjs - [5 ms] - it is a passing todo',
            '    ---',
            '        message: >',
            '            expected todo to not pass',
            '        browser log: |',
            '            I am a log',
            '            Useful information',
            '    ...',
            '',
            '1..2',
            '# tests 2',
            '# pass  0',
            '# skip  0',
            '# todo  1',
            '# fail  1',
            ''
          ]);
        });
      });
    });

    context('without name', function() {
      it('writes out TAP', function() {
        var reporter = new TapReporter(false, stream, config);
        reporter.report('phantomjs', {
          passed: true,
          logs: [],
          runDuration: 1,
        });
        reporter.finish();
        assert.deepEqual(stream.read().toString().split('\n'), [
          'ok 1 phantomjs - [1 ms]',
          '',
          '1..1',
          '# tests 1',
          '# pass  1',
          '# skip  0',
          '# todo  0',
          '# fail  0',
          '',
          '# ok',
          ''
        ]);
      });
    });

    context('with error-only output', function() {
      beforeEach(function() {
        config = new Config('ci', { tap_failed_tests_only: true });
      });

      context('without errors', function() {
        it('writes out no TAP', function() {
          var reporter = new TapReporter(false, stream, config);
          reporter.report('phantomjs', {
            name: 'it does stuff',
            passed: true,
            logs: ['some log'],
            runDuration: 3,
          });
          reporter.report('phantomjs', {
            name: 'it is skipped',
            skipped: true,
            logs: [],
            runDuration: 0,
          });
          reporter.finish();
          assert.deepEqual(stream.read().toString().split('\n'), [
            '',
            '1..2',
            '# tests 2',
            '# pass  1',
            '# skip  1',
            '# todo  0',
            '# fail  0',
            '',
            '# ok',
            ''
          ]);
        });
      });

      context('with errors', function() {
        it('writes out TAP with failure info, only for negative tests', function() {
          var reporter = new TapReporter(false, stream, config);
          reporter.report('phantomjs', {
            name: 'it does stuff',
            passed: true,
            logs: ['some log'],
            runDuration: 50,
          });
          reporter.report('phantomjs', {
            name: 'it fails',
            passed: false,
            error: { message: 'it crapped out' },
            logs: ['I am a log', 'Useful information'],
            runDuration: 5,
          });
          reporter.report('phantomjs', {
            name: 'it is skipped',
            skipped: true,
            logs: [],
            runDuration: 0,
          });
          reporter.finish();
          assert.deepEqual(stream.read().toString().split('\n'), [
            'not ok 1 phantomjs - [5 ms] - it fails',
            '    ---',
            '        message: >',
            '            it crapped out',
            '        browser log: |',
            '            I am a log',
            '            Useful information',
            '    ...',
            '',
            '1..3',
            '# tests 3',
            '# pass  1',
            '# skip  1',
            '# todo  0',
            '# fail  1',
            ''
          ]);
        });
      });

      context('with todos', function() {
        it('writes out TAP with failure info', function() {
          var reporter = new TapReporter(false, stream, config);
          reporter.report('phantomjs', {
            name: 'it is a failing todo',
            passed: false,
            todo: true,
            error: { message: 'it crapped out' },
            logs: ['I am a log', 'Useful information'],
            runDuration: 5,
          });
          reporter.report('phantomjs', {
            name: 'it is a passing todo',
            passed: true,
            todo: true,
            error: { message: 'expected todo to not pass' },
            logs: ['I am a log', 'Useful information'],
            runDuration: 5,
          });
          reporter.finish();
          assert.deepEqual(stream.read().toString().split('\n'), [
            'todo 1 phantomjs - [5 ms] - it is a failing todo',
            '    ---',
            '        message: >',
            '            it crapped out',
            '        browser log: |',
            '            I am a log',
            '            Useful information',
            '    ...',
            'not ok 2 phantomjs - [5 ms] - it is a passing todo',
            '    ---',
            '        message: >',
            '            expected todo to not pass',
            '        browser log: |',
            '            I am a log',
            '            Useful information',
            '    ...',
            '',
            '1..2',
            '# tests 2',
            '# pass  0',
            '# skip  0',
            '# todo  1',
            '# fail  1',
            ''
          ]);
        });
      });
    });

    context('with strict spec compliance', function() {
      beforeEach(function() {
        config = new Config('ci', { tap_strict_spec_compliance: true });
      });

      context('without errors', function() {
        it('writes out TAP', function() {
          var reporter = new TapReporter(false, stream, config);
          reporter.report('phantomjs', {
            name: 'it does stuff',
            passed: true,
            logs: ['some log'],
            runDuration: 3,
          });
          reporter.report('phantomjs', {
            name: 'it is skipped',
            skipped: true,
            logs: [],
            runDuration: 0,
          });
          reporter.finish();
          assert.deepEqual(stream.read().toString().split('\n'), [
            'ok 1 phantomjs - [3 ms] - it does stuff',
            '    ---',
            '        browser log: |',
            '            some log',
            '    ...',
            'ok 2 phantomjs - [0 ms] - it is skipped # skip',
            '',
            '1..2',
            '# tests 2',
            '# pass  1',
            '# skip  1',
            '# todo  0',
            '# fail  0',
            '',
            '# ok',
            ''
          ]);
        });
      });

      context('with errors', function() {
        it('writes out TAP with failure info', function() {
          var reporter = new TapReporter(false, stream, config);
          reporter.report('phantomjs', {
            name: 'it does stuff',
            passed: true,
            logs: ['some log'],
            runDuration: 3,
          });
          reporter.report('phantomjs', {
            name: 'it fails',
            passed: false,
            error: { message: 'it crapped out' },
            logs: ['I am a log', 'Useful information'],
            runDuration: 5,
          });
          reporter.report('phantomjs', {
            name: 'it is skipped',
            skipped: true,
            logs: [],
            runDuration: 0,
          });
          reporter.finish();
          assert.deepEqual(stream.read().toString().split('\n'), [
            'ok 1 phantomjs - [3 ms] - it does stuff',
            '    ---',
            '        browser log: |',
            '            some log',
            '    ...',
            'not ok 2 phantomjs - [5 ms] - it fails',
            '    ---',
            '        message: >',
            '            it crapped out',
            '        browser log: |',
            '            I am a log',
            '            Useful information',
            '    ...',
            'ok 3 phantomjs - [0 ms] - it is skipped # skip',
            '',
            '1..3',
            '# tests 3',
            '# pass  1',
            '# skip  1',
            '# todo  0',
            '# fail  1',
            ''
          ]);
        });
      });

      context('with todos', function() {
        it('writes out TAP with failure info', function() {
          var reporter = new TapReporter(false, stream, config);
          reporter.report('phantomjs', {
            name: 'it is a failing todo',
            passed: false,
            todo: true,
            error: { message: 'it crapped out' },
            logs: ['I am a log', 'Useful information'],
            runDuration: 5,
          });
          reporter.report('phantomjs', {
            name: 'it is a passing todo',
            passed: true,
            todo: true,
            error: { message: 'expected todo to not pass' },
            logs: ['I am a log', 'Useful information'],
            runDuration: 5,
          });
          reporter.finish();
          assert.deepEqual(stream.read().toString().split('\n'), [
            'not ok 1 phantomjs - [5 ms] - it is a failing todo # todo',
            '    ---',
            '        message: >',
            '            it crapped out',
            '        browser log: |',
            '            I am a log',
            '            Useful information',
            '    ...',
            'ok 2 phantomjs - [5 ms] - it is a passing todo # bonus',
            '    ---',
            '        message: >',
            '            expected todo to not pass',
            '        browser log: |',
            '            I am a log',
            '            Useful information',
            '    ...',
            '',
            '1..2',
            '# tests 2',
            '# pass  0',
            '# skip  0',
            '# todo  1',
            '# fail  1',
            ''
          ]);
        });
      });
    });

    context('willDisplay', function() {
      it('silent only, no result', function() {
        config = new Config('ci', {});
        var reporter = new TapReporter(true, stream, config);
        assert.equal(reporter.willDisplay(), false);
      });
      it('silent only, has result with no error', function() {
        config = new Config('ci', {});
        var reporter = new TapReporter(true, stream, config);
        assert.equal(reporter.willDisplay({}), false);
      });
      it('silent only, has result with error', function() {
        config = new Config('ci', {});
        var reporter = new TapReporter(true, stream, config);
        assert.equal(reporter.willDisplay({error: true}), false);
      });
      it('not silent, no result', function() {
        config = new Config('ci', {});
        var reporter = new TapReporter(false, stream, config);
        assert.equal(reporter.willDisplay(), false);
      });
      it('not silent, result w/error', function() {
        config = new Config('ci', {});
        var reporter = new TapReporter(false, stream, config);
        assert.equal(reporter.willDisplay(), false);
      });
      it('not silent, tap_failed_tests_only, no error', function() {
        config = new Config('ci', { tap_failed_tests_only: true });
        var reporter = new TapReporter(false, stream, config);
        assert.equal(reporter.willDisplay({error: false}), false);
      });
      it('not silent, tap_failed_tests_only, has error', function() {
        config = new Config('ci', { tap_failed_tests_only: true });
        var reporter = new TapReporter(false, stream, config);
        assert.equal(reporter.willDisplay({error: true}), true);
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
        assert.match(output, / {2}\.\n\n/);
        assert.match(output, /\[duration - [0-9]+ ms\]\n/);
        assert.match(output, /1\.\.1/);
        assert.match(output, /# tests 1\n/);
        assert.match(output, /# pass {2}1\n/);
        assert.match(output, /# skip {2}0\n/);
        assert.match(output, /# todo {2}0\n/);
        assert.match(output, /# fail {2}0\n/);
        assert.match(output, /# ok\n/);
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
        assert.match(output.shift(), / {2}F/);
        output.shift();
        assert.match(output.shift(), /\[duration - [0-9]+ ms\]/);
        assert.match(output.shift(), /1\.\.1/);
        assert.match(output.shift(), /# tests 1/);
        assert.match(output.shift(), /# pass {2}0/);
        assert.match(output.shift(), /# skip {2}0/);
        assert.match(output.shift(), /# todo {2}0/);
        assert.match(output.shift(), /# fail {2}1/);
        assert.notMatch(output.shift(), /# ok\n/);
        assert.match(output.shift(), / {2}1\) \[phantomjs\] it fails/);
        assert.match(output.shift(), / {5}This should be a number/);
        output.shift();
        assert.match(output.shift(), / {5}expected: 7/);
        assert.match(output.shift(), / {7}actual: 'Seven'/);
        output.shift();
        assert.match(output.shift(), / {5}trace/);
        output.shift();
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
        assert.match(output, / {2}\*/);
        assert.match(output, /\[duration - [0-9]+ ms\]\n/);
        assert.match(output, /# tests 1\n/);
        assert.match(output, /# pass {2}0\n/);
        assert.match(output, /# skip {2}1\n/);
        assert.match(output, /# todo {2}0\n/);
        assert.match(output, /# fail {2}0\n/);
        assert.match(output, /# ok\n/);
      });
    });

    context('with todo', function() {
      it('writes out summary', function() {
        var stream = new PassThrough();
        var reporter = new DotReporter(false, stream);
        reporter.report('phantomjs', {
          name: 'it is a failing todo',
          passed: false,
          todo: true,
          error: {
            actual: 'Seven',
            expected: 7,
            message: 'This should be a number',
            stack: 'trace'
          }
        });
        reporter.report('phantomjs', {
          name: 'it is a passing todo',
          passed: true,
          todo: true,
          error: { message: 'expected todo to not pass' },
          logs: []
        });
        reporter.finish();
        var output = stream.read().toString();
        assert.match(output, / {2}TF/);
        assert.match(output, /\[duration - [0-9]+ ms\]\n/);
        assert.match(output, /# tests 2\n/);
        assert.match(output, /# pass {2}0\n/);
        assert.match(output, /# skip {2}0\n/);
        assert.match(output, /# todo {2}1\n/);
        assert.match(output, /# fail {2}1\n/);
        assert.notMatch(output, /# ok\n/);
      });
    });

    context('with errored negative assertion', function() {
      it('writes out summary with negated expected in failure info', function() {
        var stream = new PassThrough();
        var reporter = new DotReporter(false, stream);
        reporter.report('phantomjs', {
          name: 'it fails',
          passed: false,
          error: {
            actual: 'foo',
            expected: 'foo',
            message: 'This should not be foo',
            stack: 'trace',
            negative: true
          }
        });
        reporter.finish();
        var output = stream.read().toString().split('\n');

        output.shift();
        assert.match(output.shift(), / {2}F/);
        output.shift();
        assert.match(output.shift(), /\[duration - [0-9]+ ms\]/);
        assert.match(output.shift(), /1\.\.1/);
        assert.match(output.shift(), /# tests 1/);
        assert.match(output.shift(), /# pass {2}0/);
        assert.match(output.shift(), /# skip {2}0/);
        assert.match(output.shift(), /# todo {2}0/);
        assert.match(output.shift(), /# fail {2}1/);
        assert.notMatch(output.shift(), /# ok\n/);
        assert.match(output.shift(), / {2}1\) \[phantomjs\] it fails/);
        assert.match(output.shift(), / {5}This should not be foo/);
        output.shift();
        assert.match(output.shift(), / {5}expected: NOT 'foo'/);
        assert.match(output.shift(), / {7}actual: 'foo'/);
        output.shift();
        assert.match(output.shift(), / {5}trace/);
        output.shift();
        assert.equal(output, '');
      });
    });
  });

  describe('xunit reporter', function() {
    var config, stream;

    beforeEach(function() {
      config = new Config('ci', {
        xunit_intermediate_output: false
      });
      stream = new PassThrough();
    });

    it('writes out and XML escapes results', function() {
      var reporter = new XUnitReporter(false, stream, config);
      reporter.report('phantomjs', {
        name: 'it does <cool> "cool" \'cool\' stuff',
        passed: true
      });
      reporter.finish();
      var output = stream.read().toString();
      assert.match(output, /<testsuite name="Testem Tests" tests="1" skipped="0" todo="0" failures="0" timestamp="(.+)" time="(\d+(\.\d+)?)">/);
      assert.match(output, /<testcase classname="phantomjs" name="it does &lt;cool> &quot;cool&quot; 'cool' stuff"/);

      assertXmlIsValid(output);
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
          message: 'it crapped out',
          stack: (new Error('it crapped out')).stack
        }
      });
      reporter.finish();
      var output = stream.read().toString();
      assert.match(output, /it didnt work/);
      assert.match(output, /<error message="it crapped out">/);
      assert.match(output, /CDATA\[Source:\nError: it crapped out/);
      assertXmlIsValid(output);
    });

    it('outputs assertion error', function() {
      var reporter = new XUnitReporter(false, stream, config);
      reporter.report('phantomjs', {
        name: 'it didnt work',
        passed: false,
        error: {
          message: undefined,
          actual: 'foo',
          expected: 'bar',
          negative: false,
          stack: (new Error('it crapped out')).stack
        }
      });
      reporter.finish();
      var output = stream.read().toString();
      assert.match(output, /it didnt work/);
      assert.match(output, /<error message="Assertion Failed">/);
      assert.match(output, /CDATA\[Expected:\n {4}bar\n\nResult:\n {4}foo\n\nSource:\nError: it crapped out/);

      assertXmlIsValid(output);
    });

    it('outputs assertion error with non string expected', function() {
      var reporter = new XUnitReporter(false, stream, config);
      reporter.report('phantomjs', {
        name: 'it didnt work',
        passed: false,
        error: {
          message: undefined,
          actual: 'foo',
          expected: false,
          negative: false,
          stack: (new Error('it crapped out')).stack
        }
      });
      reporter.finish();
      var output = stream.read().toString();
      assert.match(output, /it didnt work/);
      assert.match(output, /<error message="Assertion Failed">/);
      assert.match(output, /CDATA\[Expected:\n {4}false\n\nResult:\n {4}foo\n\nSource:\nError: it crapped out/);

      assertXmlIsValid(output);
    });

    it('outputs negative assertion error', function() {
      var reporter = new XUnitReporter(false, stream, config);
      reporter.report('phantomjs', {
        name: 'it didnt work',
        passed: false,
        error: {
          message: undefined,
          actual: 'foo',
          expected: 'bar',
          negative: true,
          stack: (new Error('it crapped out')).stack
        }
      });
      reporter.finish();
      var output = stream.read().toString();
      assert.match(output, /it didnt work/);
      assert.match(output, /<error message="Assertion Failed">/);
      assert.match(output, /CDATA\[Expected:\n {4}bar\n\nResult:\n {4}NOT foo\n\nSource:\nError: it crapped out/);

      assertXmlIsValid(output);
    });

    it('outputs errors without stack traces', function() {
      var config = new Config('ci', {
        xunit_intermediate_output: false,
        xunit_exclude_stack: true
      });
      var reporter = new XUnitReporter(false, stream, config);
      reporter.report('phantomjs', {
        name: 'it didnt work',
        passed: false,
        error: {
          message: 'it crapped out',
          stack: (new Error('it crapped out')).stack
        }
      });
      reporter.finish();
      var output = stream.read().toString();
      assert.match(output, /it didnt work/);
      assert.match(output, /<error message="it crapped out"\/>/);
      assert.notMatch(output, /CDATA\[Error: it crapped out/);

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

    it('outputs todo tests', function() {
      var reporter = new XUnitReporter(false, stream, config);
      reporter.report('phantomjs', {
        name: 'it didnt work',
        passed: false,
        todo: true
      });
      reporter.finish();
      var output = stream.read().toString();
      assert.match(output, /<todo\/>/);

      assertXmlIsValid(output);
    });

    it('skipped tests are not considered failures', function() {
      var reporter = new XUnitReporter(false, stream, config);
      reporter.report('phantomjs', {
        name: 'it didnt work',
        passed: false,
        skipped: true
      });
      reporter.finish();
      var output = stream.read().toString();
      assert.notMatch(output, /<failure/);

      assertXmlIsValid(output);
    });

    it('passing todo tests are considered failures', function() {
      var reporter = new XUnitReporter(false, stream, config);
      reporter.report('phantomjs', {
        name: 'it didnt work',
        passed: true,
        todo: true
      });
      reporter.finish();
      var output = stream.read().toString();
      assert.notMatch(output, /<failure/);

      assertXmlIsValid(output);
    });

    it('outputs failed tests', function() {
      var reporter = new XUnitReporter(false, stream, config);
      reporter.report('phantomjs', {
        name: 'it didnt work',
        passed: false
      });
      reporter.finish();
      var output = stream.read().toString();
      assert.match(output, /<failure/);

      assertXmlIsValid(output);
    });

    it('XML escapes errors', function() {
      var reporter = new XUnitReporter(false, stream, config);
      reporter.report('phantomjs', {
        name: 'it failed with quotes',
        passed: false,
        error: {
          message: (new Error('<it> "crapped" out')).stack
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
        name: 'it does <cool> "cool" \'cool\' stuff',
        passed: true,
        runDuration: 1234
      });
      reporter.report('phantomjs', {
        name: 'it skips stuff',
        skipped: true
      });

      reporter.report('phantomjs', {
        name: 'it handles failures',
        passed: false,
        error: {
          passed: false,
          message: 'foo',
          stack: 'bar'
        }
      });

      reporter.report('phantomjs', {
        name: 'it handles undefined errors',
        passed: false,
        skipped: undefined,
        error: undefined,
        pending: undefined,
        runDuration: 42
      });

      reporter.finish();
      var output = stream.read().toString();

      assert.match(output, /##teamcity\[testSuiteFinished name='testem\.suite' duration='(\d+(\.\d+)?)'\]/);
      assert.match(output, /##teamcity\[testStarted name='phantomjs - it does <cool> "cool" \|'cool\|' stuff']/);
      assert.match(output, /##teamcity\[testFinished name='phantomjs - it does <cool> "cool" \|'cool\|' stuff' duration='1234']/);
      assert.match(output, /##teamcity\[testStarted name='phantomjs - it skips stuff']/);
      assert.match(output, /##teamcity\[testIgnored name='phantomjs - it skips stuff' message='pending']/);
      assert.match(output, /##teamcity\[testFinished name='phantomjs - it skips stuff']/);
      assert.match(output, /##teamcity\[testStarted name='phantomjs - it handles failures']/);
      assert.match(output, /##teamcity\[testFailed name='phantomjs - it handles failures' message='foo' details='bar']/);
      assert.match(output, /##teamcity\[testFinished name='phantomjs - it handles failures']/);
      assert.match(output, /##teamcity\[testStarted name='phantomjs - it handles undefined errors']/);
      assert.match(output, /##teamcity\[testFailed name='phantomjs - it handles undefined errors' message='' details='']/);
      assert.match(output, /##teamcity\[testFinished name='phantomjs - it handles undefined errors' duration='42']/);
    });

    it('uses comparisonFailure type for comparison errors', function() {
      var reporter = new TeamcityReporter(false, stream);

      reporter.report('firefox', {
        name: 'it handles failures',
        passed: false,
        error: {
          passed: false,
          expected: 'foo',
          actual: 'bar'
        }
      });

      reporter.finish();
      var output = stream.read().toString();

      assert.match(output, /##teamcity\[testFailed name='firefox - it handles failures' message='' details='' type='comparisonFailure' expected='foo' actual='bar']/);
    });

    it('generates teamcity lines', function() {
      [
        ['testStarted', {bar: 'baz'}, '##teamcity[testStarted bar=\'baz\']\n'],
        ['testIgnored', {bar: 'baz', runDuration: 42}, '##teamcity[testIgnored bar=\'baz\' runDuration=\'42\']\n'],
      ].forEach(([type, options, expected]) =>
        assert.equal(TeamcityReporter.teamcityLine(type, options), expected));
    });

    it('negates expected for negative assertions', function() {
      var reporter = new TeamcityReporter(false, stream);

      reporter.report('firefox', {
        name: 'it negates',
        passed: false,
        error: {
          passed: false,
          expected: 'foo',
          actual: 'foo',
          negative: true
        }
      });

      reporter.finish();
      var output = stream.read().toString();

      assert.match(output, /##teamcity\[testFailed name='firefox - it negates' message='' details='' type='comparisonFailure' expected='NOT foo' actual='foo']/);
    });

  });
});
