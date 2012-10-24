var libDir = '../../lib/'
var sandbox = require('sandboxed-module')
var expect = require('chai').expect
var screen = require('./fake_screen')
var Backbone = require('backbone')
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
var runnertabs = sandbox.require(libDir + 'ui/runner_tabs', {
    requires: {
        './screen': screen
        , './split_log_panel': SplitLogPanel
    }
})
var RunnerTab = runnertabs.RunnerTab

describe('RunnerTab', function(){
    var tab, runner, appview, results
    beforeEach(function(){
        screen.$setSize(20, 8)
        results = new Backbone.Model
        runner = new Backbone.Model({
            name: 'Bob'
            , messages: new Backbone.Collection
            , results: results
        })
        runner.hasMessages = function(){ return false }
        appview = new Backbone.Model
        appview.isPopupVisible = function(){ return false }
        tab = new RunnerTab({
            runner: runner
            , appview: appview
            , selected: true
            , index: 0
        })
    })
    it('renders', function(){
        expect(screen.buffer).to.be.deep.equal([
            '                    ',
            '                    ',
            '                    ',
            ' ━━━━━━━━━━━━━━┓    ',
            '       Bob     ┃    ',
            '        ◜      ┃    ',
            '               ┗    ',
            '                    ' ])
    })
    /*it('renders test results', function(){
        results.set('passed', 1)
        results.set('total', 1)
        expect(screen.buffer).to.be.deep.equal([
            '                    ',
            '                    ',
            '                    ',
            ' ━━━━━━━━━━━━━━┓    ',
            '       Bob     ┃    ',
            '     1/1 ◜     ┃    ',
            '               ┗    ',
            '                    ' ])
    })*/
    it('renders check mark if all passed', function(){

    })
})
