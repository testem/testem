var expect = require('chai').expect
var Backbone = require('backbone')
var screen = require('./fake_screen')
var SplitLogPanel = require('../../lib/dev/ui/split_log_panel')
var stub = require('bodydouble').stub
var spy = require('ispy')
var Chars = require('../../lib/chars')
var isWin = /^win/.test(process.platform)

describe('SplitLogPanel', !isWin ? function(){

  var runner, panel, appview, results, messages

  beforeEach(function(){
    screen.$setSize(10, 20)
    results = new Backbone.Model()
    messages = new Backbone.Collection()
    runner = new Backbone.Model({
      results: results,
      messages: messages
    })
    appview = new Backbone.Model({
      cols: 10,
      lines: 20
    })
    runner.hasMessages = function(){ return true }
    runner.hasResults = function(){ return true }
    panel = new SplitLogPanel({
      runner: runner,
      appview: appview,
      visible: true,
      screen: screen
    })
  })

  describe('getResultsDisplayText', function(){
    it('gets topLevelError', function(){
      expect(panel.getResultsDisplayText().unstyled()).to.equal('')
      results.set('topLevelError', 'Shit happened.')
      expect(panel.getResultsDisplayText().unstyled()).to.equal('Top Level:\n    Shit happened.\n\n')
    })
    it('says "Please be patient" if not all results are in', function(){
      var tests = new Backbone.Collection()
      results.set('tests', tests)
      expect(panel.getResultsDisplayText().unstyled()).to.equal('Please be patient :)')
    })
    it('says "No tests were run :(" when no tests but all is true', function(){
      var tests = new Backbone.Collection()
      results.set('tests', tests)
      results.set('all', true)
      expect(panel.getResultsDisplayText().unstyled()).to.equal('No tests were run :(')
    })
    it('gives result when has results and all is true', function(){
      results.set('total', 1)
      results.set('pending', 0)
      var tests = new Backbone.Collection([
        new Backbone.Model({ name: 'blah', passed: true })
      ])
      results.set('tests', tests)
      results.set('all', true)
      expect(panel.getResultsDisplayText().unstyled()).to.equal(Chars.success + ' 1 tests complete.')
    })
    it('shows pending tests in yellow when has results, all is true, no tests failed and there are pending tests', function(){
      results.set('total', 1)
      results.set('pending', 1)
      var tests = new Backbone.Collection([
        new Backbone.Model({ name: 'blah', pending: true })
      ])
      results.set('tests', tests)
      results.set('all', true)

      var text = panel.getResultsDisplayText()

      expect(text.children).to.have.length(2)

      var resultText = text.children[0]
      var pendingText = text.children[1]

      expect(resultText.str).to.equal(Chars.success + ' 1 tests complete (1 pending).')
      expect(resultText.attrs.foreground).to.equal('cyan')

      expect(pendingText.str).to.equal('\n\n[PENDING] blah')
      expect(pendingText.attrs.foreground).to.equal('yellow')
    })
    it('shows "failed" when failure', function(){
      results.set('total', 1)
      var tests = new Backbone.Collection([
        new Backbone.Model({
          name: 'blah', passed: false, failed: 1,
          items: [
            { passed: false }
          ]
        })
      ])
      results.set('tests', tests)
      results.set('all', true)
      expect(panel.getResultsDisplayText().unstyled()).to.match(/blah\n    [x✘] failed/)
    })
    it('shows the error message', function(){
      results.set('total', 1)
      var tests = new Backbone.Collection([
        new Backbone.Model({
          name: 'blah', passed: false, failed: 1,
          items: [
            { message: 'should not be null', passed: false }
          ]
        })
      ])
      results.set('tests', tests)
      results.set('all', true)
      expect(panel.getResultsDisplayText().unstyled()).to.match(/blah\n    [x✘] should not be null/)
    })
    it('shows the stacktrace', function(){
      results.set('total', 1)
      var tests = new Backbone.Collection([
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
      ])
      results.set('tests', tests)
      results.set('all', true)
      expect(panel.getResultsDisplayText().unstyled()).to.equal('blah\n    ' + Chars.fail + ' should not be null\n        AssertionError: \n            at Module._compile (module.js:437:25)\n            at Object.Module._extensions..js (module.js:467:10)')
    })
    it('says "Looking good..." if all is false but all passed so far', function(){
      results.set('total', 1)
      var tests = new Backbone.Collection([
        new Backbone.Model({
          name: 'blah', passed: true
        })
      ])
      results.set('tests', tests)
      expect(panel.getResultsDisplayText().unstyled()).to.equal('Looking good...')
    })
  })

  describe('getMessagesText', function(){

    it('returns "" with no messages', function(){
      expect(panel.getMessagesText().unstyled()).to.equal('')
    })

    it('returns "" with empty collection', function(){
      var messages = new Backbone.Collection()
      runner.set('messages', messages)
      expect(panel.getMessagesText().unstyled()).to.equal('')
    })

    it('returns the messages', function(){
      var messages = new Backbone.Collection([
        new Backbone.Model({type: 'log', text: 'hello world'})
      ])
      runner.set('messages', messages)
      expect(panel.getMessagesText().unstyled()).to.equal('hello world')
      messages.add(new Backbone.Model({type: 'error', text: 'crap happens'}))
      expect(panel.getMessagesText().unstyled()).to.equal('hello worldcrap happens')
    })

  })

  describe('targetPanel', function(){
    it('is the top if only has test results', function(){
      stub(runner, 'hasResults').returns(true)
      stub(runner, 'hasMessages').returns(false)
      expect(panel.targetPanel()).to.equal(panel.topPanel)
    })
    it('is the bottom if only has messages', function(){
      stub(runner, 'hasResults').returns(false)
      stub(runner, 'hasMessages').returns(true)
      expect(panel.targetPanel()).to.equal(panel.bottomPanel)
    })
    context('has both results and messages', function(){
      beforeEach(function(){
        stub(runner, 'hasResults').returns(true)
        stub(runner, 'hasMessages').returns(true)
      })
      it('is the top if focused on top', function(){
        panel.set('focus', 'top')
        expect(panel.targetPanel()).to.equal(panel.topPanel)
      })
      it('is the bottom if focused on bottom', function(){
        panel.set('focus', 'bottom')
        expect(panel.targetPanel()).to.equal(panel.bottomPanel)
      })
    })
    it('is the top if has neither', function(){
      stub(runner, 'hasResults').returns(false)
      stub(runner, 'hasMessages').returns(false)
      expect(panel.targetPanel()).to.equal(panel.topPanel)
    })
  })

  describe('scrolling', function(){
    'scrollUp scrollDown pageUp pageDown halfPageUp halfPageDown'.split(' ').forEach(function(method){
      it('delegates ' + method + ' to the target Panel', function(){
        var targetPanel = {}
        targetPanel[method] = spy()
        stub(panel, 'targetPanel').returns(targetPanel)
        panel[method]()
        expect(targetPanel[method].called).to.be.ok
      })
    })
  })

  describe('syncDimensions', function(){
    it('shows both panels if has both results and messages', function(){
      stub(runner, 'hasResults').returns(true)
      stub(runner, 'hasMessages').returns(true)
      panel.syncDimensions()
      expect(panel.topPanel.get('height')).to.equal(6)
      expect(panel.bottomPanel.get('height')).to.equal(6)
    })
    it('show top panel only if only has results', function(){
      stub(runner, 'hasResults').returns(true)
      stub(runner, 'hasMessages').returns(false)
      panel.syncDimensions()
      expect(panel.topPanel.get('height')).to.equal(12)
      expect(panel.bottomPanel.get('height')).to.equal(0)
    })
    it('show bottom panel only if only has messages', function(){
      stub(runner, 'hasResults').returns(false)
      stub(runner, 'hasMessages').returns(true)
      panel.syncDimensions()
      expect(panel.topPanel.get('height')).to.equal(0)
      expect(panel.bottomPanel.get('height')).to.equal(12)
    })
  })

  describe('render', function(){
    it('renders', function(){
      stub(panel, 'getResultsDisplayText').returns('1 tests passed.')
      stub(panel, 'getMessagesText').returns('This is a message.')
      panel.syncResultsDisplay()
      panel.syncMessages()
      panel.render()
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
        '          ' ])
    })
  })

}: function() {
  xit('TODO: Fix and re-enable for windows')
})
