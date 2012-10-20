var expect = require('chai').expect
var sandbox = require('sandboxed-module')
var Backbone = require('backbone')
var spy = require('sinon').spy
var libDir = '../../lib/'
var screen = require('./fake_screen')
var ScrollableTextPanel = sandbox.require(libDir + 'ui/scrollable_text_panel', {
    requires: {
        './screen': screen
    }
})
var SplitLogPanel = sandbox.require(libDir + 'ui/split_log_panel', {
    requires: {
        './screen': screen
        , './scrollable_text_panel': ScrollableTextPanel
    }
})

describe('SplitLogPanel', function(){

    var runner, panel, appview, results, messages

    beforeEach(function(){
        screen.$setSize(10, 20)
        results = new Backbone.Model
        messages = new Backbone.Collection
        runner = new Backbone.Model({
            results: results
            , messages: messages
        })
        appview = new Backbone.Model({
            cols: 10
            , lines: 20
        })
        runner.hasMessages = function(){ return true }
        runner.hasResults = function(){ return true }
        panel = new SplitLogPanel({
            runner: runner
            , appview: appview
            , visible: true
        })
    })

    it('initializes', function(){})

    describe('getResultsDisplayText', function(){
        it('gets topLevelError', function(){
            expect(panel.getResultsDisplayText().unstyled()).to.equal('')
            results.set('topLevelError', 'Shit happened.')
            expect(panel.getResultsDisplayText().unstyled()).to.equal('Top Level:\n    Shit happened.\n\n')
        })
        it('says "Please be patient" if not all results are in', function(){
            var tests = new Backbone.Collection
            results.set('tests', tests)
            expect(panel.getResultsDisplayText().unstyled()).to.equal('Please be patient :)')
        })
        it('says "No tests were run :(" when no tests but all is true', function(){
            var tests = new Backbone.Collection
            results.set('tests', tests)
            results.set('all', true)
            expect(panel.getResultsDisplayText().unstyled()).to.equal('No tests were run :(')
        })
        it('gives result when has results and all is true', function(){
            results.set('total', 1)
            var tests = new Backbone.Collection([
                new Backbone.Model({ name: 'blah', passed: true })
            ])
            results.set('tests', tests)
            results.set('all', true)
            expect(panel.getResultsDisplayText().unstyled()).to.equal('\u2714 1 tests complete.')
        })
    })


    xit('renders', function(){
        panel.render()
        expect(screen.buffer).to.deep.equal([])
    })

})