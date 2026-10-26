import CurrentTime from "../../lib/utils/current-time.js";
import TapReporter from "../../lib/reporters/tap_reporter.js";
import DotReporter from "../../lib/reporters/dot_reporter.js";
import XUnitReporter from "../../lib/reporters/xunit_reporter.js";
import TeamcityReporter from "../../lib/reporters/teamcity_reporter.js";
import Config from "../../lib/config.js";
import { PassThrough } from "node:stream";
import XmlDom from "@xmldom/xmldom";
import { assert } from "chai";
import { inspect } from "node:util";
import readStream from "../support/read-stream.js";

var assertXmlIsValid = function(xmlString) {
  var failure = null;
  var parser = new XmlDom.DOMParser({
    onError: function(level, msg) { failure = msg; }
  });

  try {
    parser.parseFromString(xmlString, 'text/xml');
  } catch (e) {
    failure = failure || e.message;
  }

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
          reporter.report('phantomjs', {
            name: 'it logs something other than a string',
            passed: true,
            logs: [{text: 'ye olde texte'}],
            runDuration: 3,
          });
          reporter.finish();
          assert.deepEqual(readStream(stream).split('\n'), [
            'ok 1 phantomjs - [3 ms] - it does stuff',
            '    ---',
            '        browser log: |',
            '            some log',
            '    ...',
            'skip 2 phantomjs - [0 ms] - it is skipped',
            'ok 3 phantomjs - [3 ms] - it logs something other than a string',
            '    ---',
            '        browser log: |',
            '            {"text":"ye olde texte"}',
            '    ...',
            '',
            '1..3',
            '# tests 3',
            '# pass  2',
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
          assert.deepEqual(readStream(stream).split('\n'), [
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
          assert.deepEqual(readStream(stream).split('\n'), [
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
          assert.deepEqual(readStream(stream).split('\n'), [
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
          assert.deepEqual(readStream(stream).split('\n'), [
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
        assert.deepEqual(readStream(stream).split('\n'), [
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

    context('with non-string error values', function() {
      it('serializes objects instead of printing [object Object]', function() {
        var circular = { name: 'circular' };
        circular.self = circular;
        var reporter = new TapReporter(false, stream, config);
        reporter.report('phantomjs', {
          name: 'it fails',
          passed: false,
          error: {
            message: 'objects should match',
            actual: { n: 'Seven' },
            expected: { n: 7, list: [1, 2] },
            negative: false,
            circular: circular
          },
          runDuration: 5
        });
        reporter.finish();
        assert.deepEqual(readStream(stream).split('\n').slice(0, 25), [
          'not ok 1 phantomjs - [5 ms] - it fails',
          '    ---',
          '        message: >',
          '            objects should match',
          '        actual: >',
          '            {',
          '              "n": "Seven"',
          '            }',
          '        expected: >',
          '            {',
          '              "n": 7,',
          '              "list": [',
          '                1,',
          '                2',
          '              ]',
          '            }',
          '        negative: >',
          '            false',
          '        circular: >',
          '            [object Object]',
          '    ...',
          '',
          '1..1',
          '# tests 1',
          '# pass  0'
        ]);
      });
    });

    context('without runDuration', function() {
      it('omits the duration instead of printing [undefined ms]', function() {
        var reporter = new TapReporter(false, stream, config);
        reporter.report('tap', {
          name: 'it does stuff',
          passed: true,
          logs: []
        });
        reporter.report('tap', {
          name: 'error',
          passed: false,
          error: { message: 'it crapped out' },
          logs: []
        });
        reporter.finish();
        var lines = readStream(stream).split('\n');
        assert.deepEqual(lines.slice(0, 2), [
          'ok 1 tap - it does stuff',
          'not ok 2 tap - error'
        ]);
        assert.notInclude(lines.join('\n'), 'undefined');
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
          assert.deepEqual(readStream(stream).split('\n'), [
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
          assert.deepEqual(readStream(stream).split('\n'), [
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
          assert.deepEqual(readStream(stream).split('\n'), [
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
          assert.deepEqual(readStream(stream).split('\n'), [
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
          assert.deepEqual(readStream(stream).split('\n'), [
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
          assert.deepEqual(readStream(stream).split('\n'), [
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

    context('with log processor', function() {
      beforeEach(function() {
        config = new Config('ci', {
          tap_log_processor: function(log) {
            return `yee ${log.text}`; } });
      });

      it('uses log processor', function() {
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
        reporter.report('phantomjs', {
          name: 'it logs something other than a string',
          passed: true,
          logs: [{text: 'ye olde texte'}],
          runDuration: 3,
        });
        reporter.finish();
        assert.deepEqual(readStream(stream).split('\n'), [
          'ok 1 phantomjs - [3 ms] - it does stuff',
          '    ---',
          '        browser log: |',
          '            some log',
          '    ...',
          'skip 2 phantomjs - [0 ms] - it is skipped',
          'ok 3 phantomjs - [3 ms] - it logs something other than a string',
          '    ---',
          '        browser log: |',
          '            yee ye olde texte',
          '    ...',
          '',
          '1..3',
          '# tests 3',
          '# pass  2',
          '# skip  1',
          '# todo  0',
          '# fail  0',
          '',
          '# ok',
          ''
        ]);
      });
    });

    context('reportLogs', function() {
      it('writes logs that do not belong to a test as TAP comments', function() {
        config = new Config('ci', {});
        var reporter = new TapReporter(false, stream, config);
        reporter.report('phantomjs', {
          name: 'it does stuff',
          passed: true,
          logs: [],
          runDuration: 3,
        });
        reporter.reportLogs('phantomjs', {
          launcherId: 1,
          logs: ['done', {type: 'log', text: 'multi\nline'}]
        });
        reporter.finish();
        assert.deepEqual(readStream(stream).split('\n').slice(0, 5), [
          'ok 1 phantomjs - [3 ms] - it does stuff',
          '# phantomjs - browser log:',
          '#     done',
          '#     {"type":"log","text":"multi\\nline"}',
          '',
        ]);
      });

      it('writes nothing with tap_quiet_logs', function() {
        config = new Config('ci', { tap_quiet_logs: true });
        var reporter = new TapReporter(false, stream, config);
        reporter.reportLogs('phantomjs', { launcherId: 1, logs: ['done'] });
        assert.isNull(stream.read());
      });

      it('writes nothing when silent', function() {
        config = new Config('ci', {});
        var reporter = new TapReporter(true, stream, config);
        reporter.reportLogs('phantomjs', { launcherId: 1, logs: ['done'] });
        assert.isNull(stream.read());
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
        var output = readStream(stream);
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
        var output = readStream(stream).split('\n');

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

      it('right-aligns failure numbers to 3 characters', function() {
        var stream = new PassThrough();
        var reporter = new DotReporter(false, stream);
        for (var i = 1; i <= 10; i++) {
          reporter.report('phantomjs', {
            name: 'it fails ' + i,
            passed: false,
            error: {
              message: 'failure ' + i
            }
          });
        }
        reporter.finish();
        var output = readStream(stream);
        assert.include(output, '  1) [phantomjs] it fails 1\n');
        assert.include(output, '  9) [phantomjs] it fails 9\n');
        assert.include(output, ' 10) [phantomjs] it fails 10\n');
      });

      it('inspects object expected and actual values', function() {
        var stream = new PassThrough();
        var reporter = new DotReporter(false, stream);
        var expected = { n: 7 };
        var actual = { n: 'Seven' };
        reporter.report('phantomjs', {
          name: 'it fails',
          passed: false,
          error: {
            actual: actual,
            expected: expected,
            message: 'objects should match',
            stack: 'trace'
          }
        });
        reporter.finish();
        var output = readStream(stream);
        assert.include(output, '     expected: ' + inspect(expected) + '\n');
        assert.include(output, '       actual: ' + inspect(actual) + '\n');
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
        var output = readStream(stream);
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
        var output = readStream(stream);
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
        var output = readStream(stream).split('\n');

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
      var output = readStream(stream);

      assert.match(output, /<testsuite name="Testem Tests" tests="1" skipped="0" todo="0" failures="0" timestamp="(.+)" time="(\d+(\.\d+)?)">/);
      assert.match(output, /<testcase classname="phantomjs" name="it does &lt;cool&gt; &quot;cool&quot; 'cool' stuff"/);

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
      var output = readStream(stream);
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
      var output = readStream(stream);
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
      var output = readStream(stream);
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
      var output = readStream(stream);
      assert.match(output, /it didnt work/);
      assert.match(output, /<error message="Assertion Failed">/);
      assert.match(output, /CDATA\[Expected:\n {4}bar\n\nResult:\n {4}NOT foo\n\nSource:\nError: it crapped out/);

      assertXmlIsValid(output);
    });

    it('serializes object values instead of printing [object Object]', function() {
      var reporter = new XUnitReporter(false, stream, config);
      reporter.report('tap', {
        name: 'objects should match',
        passed: false,
        error: {
          message: 'should be deeply equivalent',
          actual: { a: 1 },
          expected: { a: 2, list: [1, 2] },
          stack: { at: 'tests.js:6:5' }
        }
      });
      reporter.finish();
      var output = readStream(stream);
      assert.notInclude(output, '[object Object]');
      assert.include(output, [
        'CDATA[Expected:',
        '    {',
        '      "a": 2,',
        '      "list": [',
        '        1,',
        '        2',
        '      ]',
        '    }',
        '',
        'Result:',
        '    {',
        '      "a": 1',
        '    }',
        '',
        'Source:',
        '{',
        '  "at": "tests.js:6:5"',
        '}'
      ].join('\n'));

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
      var output = readStream(stream);
      assert.match(output, /it didnt work/);
      assert.match(output, /<error message="it crapped out"\/>/);
      assert.notMatch(output, /CDATA\[Error: it crapped out/);

      assertXmlIsValid(output);
    });

    it('outputs a zero time for results without runDuration', function() {
      var reporter = new XUnitReporter(false, stream, config);
      reporter.report('tap', {
        name: 'it does stuff',
        passed: true
      });
      reporter.finish();
      var output = readStream(stream);
      assert.match(output, /<testcase classname="tap" name="it does stuff" time="0"\/>/);

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
      var output = readStream(stream);
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
      var output = readStream(stream);
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
      var output = readStream(stream);
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
      var output = readStream(stream);
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
      var output = readStream(stream);
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
      var output = readStream(stream);
      assert.match(output, /it failed with quotes"/);
      assert.match(output, /&lt;it&gt; &quot;crapped&quot; out/);

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
      var output = readStream(stream);
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
      var output = readStream(stream);

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
      var output = readStream(stream);

      assert.equal(output, [
        "##teamcity[testStarted name='phantomjs - it does <cool> \"cool\" |'cool|' stuff']",
        "##teamcity[testFinished name='phantomjs - it does <cool> \"cool\" |'cool|' stuff' duration='1234']",
        "##teamcity[testStarted name='phantomjs - it skips stuff']",
        "##teamcity[testIgnored name='phantomjs - it skips stuff' message='pending']",
        "##teamcity[testFinished name='phantomjs - it skips stuff']",
        "##teamcity[testStarted name='phantomjs - it handles failures']",
        "##teamcity[testFailed name='phantomjs - it handles failures' message='foo' details='bar']",
        "##teamcity[testFinished name='phantomjs - it handles failures']",
        "##teamcity[testStarted name='phantomjs - it handles undefined errors']",
        "##teamcity[testFailed name='phantomjs - it handles undefined errors' message='' details='']",
        "##teamcity[testFinished name='phantomjs - it handles undefined errors' duration='42']",
        '',
        '',
        '',
      ].join('\n'));
    });

    it('does not emit an unmatched testSuiteFinished', function() {
      var reporter = new TeamcityReporter(false, stream);
      reporter.report('firefox', { name: 'a test', passed: true });
      reporter.finish();
      var output = readStream(stream);

      assert.notInclude(output, 'testSuiteStarted');
      assert.notInclude(output, 'testSuiteFinished');
    });

    it('does not nest when teamcity_nest_by_launcher is off', function() {
      var config = new Config('ci', {});
      var reporter = new TeamcityReporter(false, stream, config);
      reporter.report('firefox', { name: 'a test', passed: true, launcherId: '1' });
      reporter.onEnd('firefox', { launcherId: '1' });
      reporter.finish();

      assert.equal(readStream(stream), [
        "##teamcity[testStarted name='firefox - a test']",
        "##teamcity[testFinished name='firefox - a test']",
        '',
        '',
        '',
      ].join('\n'));
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
      var output = readStream(stream);

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
      var output = readStream(stream);

      assert.match(output, /##teamcity\[testFailed name='firefox - it negates' message='' details='' type='comparisonFailure' expected='NOT foo' actual='foo']/);
    });

    describe('with teamcity_nest_by_launcher', function() {
      function createReporter(options) {
        var config = new Config('ci', {}, Object.assign({ teamcity_nest_by_launcher: true }, options));
        return new TeamcityReporter(false, stream, config);
      }

      it('streams one suite per launcher, using flowId', function() {
        var reporter = createReporter();

        reporter.report('Firefox 128', { name: 'passes', passed: true, launcherId: '1', runDuration: 5 });
        var streamed = readStream(stream);
        assert.equal(streamed, [
          "##teamcity[testSuiteStarted name='Firefox 128' flowId='1']",
          "##teamcity[testStarted name='passes' flowId='1']",
          "##teamcity[testFinished name='passes' duration='5' flowId='1']",
          '',
        ].join('\n'), 'results are written as they arrive');

        reporter.report('Firefox 128', {
          name: 'fails',
          passed: false,
          launcherId: '1',
          error: { message: 'foo', stack: 'bar' }
        });
        reporter.report('Firefox 128', { name: 'skips', skipped: true, launcherId: '1' });
        reporter.onEnd('Firefox', { launcherId: '1' });

        reporter.report('Chrome 130', { name: 'passes', passed: true, launcherId: '2' });
        reporter.onEnd('Chrome', { launcherId: '2' });
        reporter.onEnd('testem', { launcherId: 0 });
        reporter.finish();

        assert.equal(readStream(stream), [
          "##teamcity[testStarted name='fails' flowId='1']",
          "##teamcity[testFailed name='fails' message='foo' details='bar' flowId='1']",
          "##teamcity[testFinished name='fails' flowId='1']",
          "##teamcity[testStarted name='skips' flowId='1']",
          "##teamcity[testIgnored name='skips' message='pending' flowId='1']",
          "##teamcity[testFinished name='skips' flowId='1']",
          "##teamcity[testSuiteFinished name='Firefox 128' flowId='1']",
          "##teamcity[testSuiteStarted name='Chrome 130' flowId='2']",
          "##teamcity[testStarted name='passes' flowId='2']",
          "##teamcity[testFinished name='passes' flowId='2']",
          "##teamcity[testSuiteFinished name='Chrome 130' flowId='2']",
          '',
          '',
          '',
        ].join('\n'));
      });

      it('closes suites of launchers that never call onEnd', function() {
        var reporter = createReporter();

        reporter.report('Chrome 130', { name: 'passes', passed: true, launcherId: '1' });
        // e.g. a browser crash: the runner reports the error under the launcher name and never calls onEnd
        reporter.report('Chrome', {
          name: 'error',
          passed: false,
          launcherId: '1',
          error: { message: 'Browser exited unexpectedly' }
        });
        reporter.finish();

        assert.equal(readStream(stream), [
          "##teamcity[testSuiteStarted name='Chrome 130' flowId='1']",
          "##teamcity[testStarted name='passes' flowId='1']",
          "##teamcity[testFinished name='passes' flowId='1']",
          "##teamcity[testStarted name='error' flowId='1']",
          "##teamcity[testFailed name='error' message='Browser exited unexpectedly' details='' flowId='1']",
          "##teamcity[testFinished name='error' flowId='1']",
          "##teamcity[testSuiteFinished name='Chrome 130' flowId='1']",
          '',
          '',
          '',
        ].join('\n'));
      });

      it('closes the previous suite when the next launcher starts reporting', function() {
        var reporter = createReporter();

        reporter.report('Chrome 130', { name: 'a', passed: true, launcherId: '1' });
        reporter.report('Firefox 128', { name: 'b', passed: true, launcherId: '2' });
        reporter.finish();

        assert.equal(readStream(stream), [
          "##teamcity[testSuiteStarted name='Chrome 130' flowId='1']",
          "##teamcity[testStarted name='a' flowId='1']",
          "##teamcity[testFinished name='a' flowId='1']",
          "##teamcity[testSuiteFinished name='Chrome 130' flowId='1']",
          "##teamcity[testSuiteStarted name='Firefox 128' flowId='2']",
          "##teamcity[testStarted name='b' flowId='2']",
          "##teamcity[testFinished name='b' flowId='2']",
          "##teamcity[testSuiteFinished name='Firefox 128' flowId='2']",
          '',
          '',
          '',
        ].join('\n'));
      });

      [2, -1, '2'].forEach(function(parallel) {
        it(`falls back to flat output with parallel: ${JSON.stringify(parallel)}`, function() {
          var flatStream = new PassThrough();
          var flat = new TeamcityReporter(false, flatStream, new Config('ci', {}, { parallel: parallel }));
          var reporter = createReporter({ parallel: parallel });

          [flat, reporter].forEach(function(r) {
            r.report('Chrome 130', { name: 'a', passed: true, launcherId: '1', runDuration: 3 });
            r.report('Firefox 128', { name: 'b', passed: false, launcherId: '2', error: { message: 'foo' } });
            r.report('Chrome 130', { name: 'c', skipped: true, launcherId: '1' });
            r.onEnd('Chrome', { launcherId: '1' });
            r.report('testem', { name: 'testem', passed: false, launcherId: 0, error: { message: 'boom' } });
            r.onEnd('testem', { launcherId: 0 });
            r.finish();
          });

          var output = readStream(stream);
          assert.equal(output, readStream(flatStream));
          assert.equal(output, [
            "##teamcity[testStarted name='Chrome 130 - a']",
            "##teamcity[testFinished name='Chrome 130 - a' duration='3']",
            "##teamcity[testStarted name='Firefox 128 - b']",
            "##teamcity[testFailed name='Firefox 128 - b' message='foo' details='']",
            "##teamcity[testFinished name='Firefox 128 - b']",
            "##teamcity[testStarted name='Chrome 130 - c']",
            "##teamcity[testIgnored name='Chrome 130 - c' message='pending']",
            "##teamcity[testFinished name='Chrome 130 - c']",
            "##teamcity[testStarted name='testem - testem']",
            "##teamcity[testFailed name='testem - testem' message='boom' details='']",
            "##teamcity[testFinished name='testem - testem']",
            '',
            '',
            '',
          ].join('\n'));
        });
      });

      it('reports testem errors outside of launcher suites', function() {
        var reporter = createReporter();

        reporter.report('Chrome 130', { name: 'a', passed: true, launcherId: '1' });
        reporter.report('testem', {
          name: 'testem',
          passed: false,
          launcherId: 0,
          error: { message: 'after_tests hook failed' }
        });
        reporter.report(null, { name: 'Error', passed: false, error: { message: 'boom' } });
        reporter.finish();

        assert.equal(readStream(stream), [
          "##teamcity[testSuiteStarted name='Chrome 130' flowId='1']",
          "##teamcity[testStarted name='a' flowId='1']",
          "##teamcity[testFinished name='a' flowId='1']",
          "##teamcity[testSuiteFinished name='Chrome 130' flowId='1']",
          "##teamcity[testStarted name='testem - testem']",
          "##teamcity[testFailed name='testem - testem' message='after_tests hook failed' details='']",
          "##teamcity[testFinished name='testem - testem']",
          "##teamcity[testStarted name='testem - Error']",
          "##teamcity[testFailed name='testem - Error' message='boom' details='']",
          "##teamcity[testFinished name='testem - Error']",
          '',
          '',
          '',
        ].join('\n'));
      });

      it('escapes suite names and flowIds', function() {
        var reporter = createReporter();

        reporter.report('Chrome [130]', { name: 'a', passed: true, launcherId: 'x\'1' });
        reporter.finish();

        assert.match(readStream(stream), /##teamcity\[testSuiteStarted name='Chrome \|\[130\|]' flowId='x\|'1']/);
      });
    });
  });
});
