const expect = require('chai').expect;
const Backbone = require('backbone');

const displayText = require('../../lib/reporters/dev/display_text');
const Chars = require('../../lib/utils/chars');
const TestResults = require('../../lib/reporters/dev/test_results');

describe('display_text', function () {
  describe('getResultsDisplayText', function () {
    it('gets topLevelError', function () {
      const results = new TestResults();
      expect(displayText.plainText(displayText.getResultsDisplayText(results))).to.equal('Please be patient :)');
      results.set('topLevelError', 'Shit happened.');
      expect(displayText.plainText(displayText.getResultsDisplayText(results))).to.equal('Top Level:\n    Shit happened.\n\n');
    });

    it('says "Please be patient" if not all results are in', function () {
      const results = new TestResults();
      results.set('tests', new Backbone.Collection());
      expect(displayText.plainText(displayText.getResultsDisplayText(results))).to.equal('Please be patient :)');
    });

    it('says "No tests were run :(" when no tests but all is true', function () {
      const results = new TestResults();
      results.set('tests', new Backbone.Collection());
      results.set('all', true);
      expect(displayText.plainText(displayText.getResultsDisplayText(results))).to.equal('No tests were run :(');
    });

    it('gives result when has results and all is true', function () {
      const results = new TestResults();
      results.set('total', 1);
      results.set('pending', 0);
      results.set('tests', new Backbone.Collection([
        new Backbone.Model({ name: 'blah', passed: true })
      ]));
      results.set('all', true);
      expect(displayText.plainText(displayText.getResultsDisplayText(results))).to.equal(Chars.success + ' 1 tests complete.');
    });

    it('shows pending tests in yellow when all done and none failed', function () {
      const results = new TestResults();
      results.set('total', 1);
      results.set('pending', 1);
      results.set('tests', new Backbone.Collection([
        new Backbone.Model({ name: 'blah', pending: true })
      ]));
      results.set('all', true);

      expect(displayText.getResultsDisplayText(results)).to.deep.equal([
        { text: Chars.success + ' 1 tests complete (1 pending).', color: 'cyan' },
        { text: '\n\n[PENDING] blah', color: 'yellow' }
      ]);
    });

    it('shows "failed" when failure', function () {
      const results = new TestResults();
      results.set('total', 1);
      results.addResult({
        name: 'blah', passed: false, failed: 1,
        items: [
          { passed: false }
        ]
      });
      results.set('all', true);
      expect(displayText.plainText(displayText.getResultsDisplayText(results))).to.contain(
        'blah\n    ' + Chars.fail + ' failed'
      );
    });

    it('shows "failed" without items when failure', function () {
      const results = new TestResults();
      results.set('total', 1);
      results.addResult({
        name: 'blah', passed: false, failed: 1
      });
      results.set('all', true);
      expect(displayText.plainText(displayText.getResultsDisplayText(results))).to.contain('blah\n    ');
    });

    it('shows the error message', function () {
      const results = new TestResults();
      results.set('total', 1);
      results.set('tests', new Backbone.Collection([
        new Backbone.Model({
          name: 'blah', passed: false, failed: 1,
          items: [
            { message: 'should not be null', passed: false }
          ]
        })
      ]));
      results.set('all', true);
      expect(displayText.plainText(displayText.getResultsDisplayText(results))).to.contain(
        'blah\n    ' + Chars.fail + ' should not be null'
      );
    });

    it('shows the stacktrace', function () {
      const results = new TestResults();
      results.set('total', 1);
      results.set('tests', new Backbone.Collection([
        new Backbone.Model({
          name: 'blah', passed: false, failed: 1,
          items: [
            {
              message: 'should not be null', passed: false,
              stack: [
                'AssertionError: ',
                '    at Module._compile (module.js:437:25)',
                '    at Object.Module._extensions..js (module.js:467:10)'
              ].join('\n')
            }
          ]
        })
      ]));
      results.set('all', true);
      expect(displayText.plainText(displayText.getResultsDisplayText(results))).to.equal(
        'blah\n    ' + Chars.fail + ' should not be null\n        AssertionError: \n            at Module._compile (module.js:437:25)\n            at Object.Module._extensions..js (module.js:467:10)'
      );
    });

    it('says "Looking good..." if all is false but all passed so far', function () {
      const results = new TestResults();
      results.set('total', 1);
      results.set('tests', new Backbone.Collection([
        new Backbone.Model({
          name: 'blah', passed: true
        })
      ]));
      expect(displayText.plainText(displayText.getResultsDisplayText(results))).to.equal('Looking good...');
    });

    it('prepends NOT to expected for negative assertions', function () {
      const results = new TestResults();
      results.set('total', 1);
      results.set('tests', new Backbone.Collection([
        new Backbone.Model({
          name: 'blah', passed: false, failed: 1,
          items: [
            {
              message: 'should not be foo', passed: false, expected: 'foo', negative: true
            }
          ]
        })
      ]));
      results.set('all', true);
      expect(displayText.plainText(displayText.getResultsDisplayText(results))).to.contain(
        'blah\n    ' + Chars.fail + ' should not be foo\n         expected NOT foo'
      );
    });
  });

  describe('getMessagesText', function () {
    it('returns "" with no messages', function () {
      expect(displayText.plainText(displayText.getMessagesText(new Backbone.Collection()))).to.equal('');
    });

    it('returns the messages', function () {
      const messages = new Backbone.Collection([
        new Backbone.Model({type: 'log', text: 'hello world'})
      ]);
      expect(displayText.plainText(displayText.getMessagesText(messages))).to.equal('hello world');
      messages.add(new Backbone.Model({type: 'error', text: 'crap happens'}));
      expect(displayText.plainText(displayText.getMessagesText(messages))).to.equal('hello worldcrap happens');
    });

    it('colors messages by type', function () {
      expect(displayText.messageColor('log')).to.equal('yellow');
      expect(displayText.messageColor('warn')).to.equal('cyan');
      expect(displayText.messageColor('info')).to.equal('green');
      expect(displayText.messageColor('error')).to.equal('red');
      const messages = new Backbone.Collection([
        new Backbone.Model({type: 'log', text: 'hello'}),
        new Backbone.Model({type: 'error', text: 'boom'})
      ]);
      expect(displayText.getMessagesText(messages)).to.deep.equal([
        { text: 'hello', color: 'yellow' },
        { text: 'boom', color: 'red' }
      ]);
    });
  });
});
