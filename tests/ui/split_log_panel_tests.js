

const expect = require('chai').expect;
const Backbone = require('backbone');
const sinon = require('sinon');

const screen = require('./fake_screen');
const SplitLogPanel = require('../../lib/reporters/dev/split_log_panel');
const displayText = require('../../lib/reporters/dev/display_text');
const Chars = require('../../lib/utils/chars');
const TestResults = require('../../lib/reporters/dev/test_results');
const isWin = require('../../lib/utils/is-win')();
const plainText = displayText.plainText;

describe('SplitLogPanel', function() {

  let runner, panel, appview, results, messages, sandbox;

  beforeEach(function() {
    sandbox = sinon.createSandbox();
    screen.$setSize(10, 20);
    results = new TestResults();
    messages = new Backbone.Collection();
    runner = new Backbone.Model({
      results: results,
      messages: messages
    });
    appview = new Backbone.Model({
      cols: 10,
      lines: 20
    });
    runner.hasMessages = function() { return true; };
    runner.hasResults = function() { return true; };
    panel = new SplitLogPanel({
      runner: runner,
      appview: appview,
      visible: true,
      screen: screen
    });
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('getResultsDisplayText', function() {
    it('gets topLevelError', function() {
      expect(plainText(panel.getResultsDisplayText())).to.equal('Please be patient :)');
      results.set('topLevelError', 'Shit happened.');
      expect(plainText(panel.getResultsDisplayText())).to.equal('Top Level:\n    Shit happened.\n\n');
    });
    it('says "Please be patient" if not all results are in', function() {
      let tests = new Backbone.Collection();
      results.set('tests', tests);
      expect(plainText(panel.getResultsDisplayText())).to.equal('Please be patient :)');
    });
    it('says "No tests were run :(" when no tests but all is true', function() {
      let tests = new Backbone.Collection();
      results.set('tests', tests);
      results.set('all', true);
      expect(plainText(panel.getResultsDisplayText())).to.equal('No tests were run :(');
    });
    it('gives result when has results and all is true', function() {
      results.set('total', 1);
      results.set('pending', 0);
      let tests = new Backbone.Collection([
        new Backbone.Model({ name: 'blah', passed: true })
      ]);
      results.set('tests', tests);
      results.set('all', true);
      expect(plainText(panel.getResultsDisplayText())).to.equal(Chars.success + ' 1 tests complete.');
    });
    it('shows pending tests in yellow when has results, all is true, no tests failed and there are pending tests', function() {
      results.set('total', 1);
      results.set('pending', 1);
      let tests = new Backbone.Collection([
        new Backbone.Model({ name: 'blah', pending: true })
      ]);
      results.set('tests', tests);
      results.set('all', true);

      expect(panel.getResultsDisplayText()).to.deep.equal([
        { text: Chars.success + ' 1 tests complete (1 pending).', color: 'cyan' },
        { text: '\n\n[PENDING] blah', color: 'yellow' }
      ]);
    });
    it('shows "failed" when failure', function() {
      results.set('total', 1);
      results.addResult({
        name: 'blah', passed: false, failed: 1,
        items: [
          { passed: false }
        ]
      });
      results.set('all', true);
      expect(plainText(panel.getResultsDisplayText())).to.contain(
        'blah\n    ' + Chars.fail + ' failed'
      );
    });
    it('shows "failed" without items when failure', function() {
      results.set('total', 1);
      results.addResult({
        name: 'blah', passed: false, failed: 1
      });
      results.set('all', true);
      expect(plainText(panel.getResultsDisplayText())).to.contain('blah\n    ');
    });
    it('shows the error message', function() {
      results.set('total', 1);
      let tests = new Backbone.Collection([
        new Backbone.Model({
          name: 'blah', passed: false, failed: 1,
          items: [
            { message: 'should not be null', passed: false }
          ]
        })
      ]);
      results.set('tests', tests);
      results.set('all', true);
      expect(plainText(panel.getResultsDisplayText())).to.contain(
        'blah\n    ' + Chars.fail + ' should not be null'
      );
    });
    it('shows the stacktrace', function() {
      results.set('total', 1);
      let tests = new Backbone.Collection([
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
      ]);
      results.set('tests', tests);
      results.set('all', true);
      expect(plainText(panel.getResultsDisplayText())).to.equal('blah\n    ' + Chars.fail + ' should not be null\n        AssertionError: \n            at Module._compile (module.js:437:25)\n            at Object.Module._extensions..js (module.js:467:10)');
    });
    it('says "Looking good..." if all is false but all passed so far', function() {
      results.set('total', 1);
      let tests = new Backbone.Collection([
        new Backbone.Model({
          name: 'blah', passed: true
        })
      ]);
      results.set('tests', tests);
      expect(plainText(panel.getResultsDisplayText())).to.equal('Looking good...');
    });
    it('prepends NOT to expected for negative assertions', function() {
      results.set('total', 1);
      let tests = new Backbone.Collection([
        new Backbone.Model({
          name: 'blah', passed: false, failed: 1,
          items: [
            {
              message: 'should not be foo', passed: false, expected: 'foo', negative: true
            }
          ]
        })
      ]);
      results.set('tests', tests);
      results.set('all', true);
      expect(plainText(panel.getResultsDisplayText())).to.contain(
        'blah\n    ' + Chars.fail + ' should not be foo\n         expected NOT foo'
      );
    });
  });

  describe('getMessagesText', function() {

    it('returns "" with no messages', function() {
      expect(plainText(panel.getMessagesText())).to.equal('');
    });

    it('returns "" with empty collection', function() {
      let messages = new Backbone.Collection();
      runner.set('messages', messages);
      expect(plainText(panel.getMessagesText())).to.equal('');
    });

    it('returns the messages', function() {
      let messages = new Backbone.Collection([
        new Backbone.Model({type: 'log', text: 'hello world'})
      ]);
      runner.set('messages', messages);
      expect(plainText(panel.getMessagesText())).to.equal('hello world');
      messages.add(new Backbone.Model({type: 'error', text: 'crap happens'}));
      expect(plainText(panel.getMessagesText())).to.equal('hello worldcrap happens');
    });

  });

  describe('targetPanel', function() {
    it('is the top if only has test results', function() {
      sandbox.stub(runner, 'hasResults').returns(true);
      sandbox.stub(runner, 'hasMessages').returns(false);
      expect(panel.targetPanel()).to.equal(panel.topPanel);
    });
    it('is the bottom if only has messages', function() {
      sandbox.stub(runner, 'hasResults').returns(false);
      sandbox.stub(runner, 'hasMessages').returns(true);
      expect(panel.targetPanel()).to.equal(panel.bottomPanel);
    });
    context('has both results and messages', function() {
      beforeEach(function() {
        sandbox.stub(runner, 'hasResults').returns(true);
        sandbox.stub(runner, 'hasMessages').returns(true);
      });
      it('is the top if focused on top', function() {
        panel.set('focus', 'top');
        expect(panel.targetPanel()).to.equal(panel.topPanel);
      });
      it('is the bottom if focused on bottom', function() {
        panel.set('focus', 'bottom');
        expect(panel.targetPanel()).to.equal(panel.bottomPanel);
      });
    });
    it('is the top if has neither', function() {
      sandbox.stub(runner, 'hasResults').returns(false);
      sandbox.stub(runner, 'hasMessages').returns(false);
      expect(panel.targetPanel()).to.equal(panel.topPanel);
    });
  });

  describe('scrolling', function() {
    'scrollUp scrollDown pageUp pageDown halfPageUp halfPageDown'.split(' ').forEach(function(method) {
      it('delegates ' + method + ' to the target Panel', function() {
        let targetPanel = {};
        targetPanel[method] = sandbox.spy();
        sandbox.stub(panel, 'targetPanel').returns(targetPanel);
        panel[method]();
        expect(targetPanel[method]).to.have.been.called();
      });
    });
  });

  describe('syncDimensions', function() {
    it('shows both panels if has both results and messages', function() {
      sandbox.stub(runner, 'hasResults').returns(true);
      sandbox.stub(runner, 'hasMessages').returns(true);
      panel.syncDimensions();
      expect(panel.topPanel.get('height')).to.equal(6);
      expect(panel.bottomPanel.get('height')).to.equal(6);
    });
    it('show top panel only if only has results', function() {
      sandbox.stub(runner, 'hasResults').returns(true);
      sandbox.stub(runner, 'hasMessages').returns(false);
      panel.syncDimensions();
      expect(panel.topPanel.get('height')).to.equal(12);
      expect(panel.bottomPanel.get('height')).to.equal(0);
    });
    it('show bottom panel only if only has messages', function() {
      sandbox.stub(runner, 'hasResults').returns(false);
      sandbox.stub(runner, 'hasMessages').returns(true);
      panel.syncDimensions();
      expect(panel.topPanel.get('height')).to.equal(0);
      expect(panel.bottomPanel.get('height')).to.equal(12);
    });
  });

  describe('render', function() {
    it('FakeScreen pixel suite retired after terminal-kit cutover', function() {
      this.skip();
    });
  });

  describe.skip('render (legacy FakeScreen)', !isWin ? function() {
    it('renders', function() {
      panel.topPanel.set('text', '1 tests passed.');
      panel.bottomPanel.set('text', 'This is a message.');
      panel.render();
      expect(screen.buffer).to.deep.equal([
        '          ',
        '          ',
        '          ',
        '          ',
        '          ',
        '          ',
        '          ',
        '1 tests pa',
        'ssed.     ',
        '          ',
        '          ',
        '          ',
        '          ',
        'This is a ',
        'message.  ',
        '          ',
        '          ',
        '          ',
        '          ',
        '          ']);
    });
  } : function() {
    xit('TODO: Fix and re-enable for windows');
  });

});
