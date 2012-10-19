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

    it.only('gets results display text', function(){
        expect(panel.getResultsDisplayText().unstyled()).to.equal('')
        results.set('topLevelError', 'Shit happened.')
        expect(panel.getResultsDisplayText().unstyled()).to.equal('Shit happened.')
    })

    it('renders', function(){
        panel.render()
        expect(screen.buffer).to.deep.equal([])
    })

})