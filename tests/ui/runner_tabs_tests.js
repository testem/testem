var expect = require('chai').expect
var screen = require('./fake_screen')
var Backbone = require('backbone')
var runnertabs = require('../../lib/ui/runner_tabs')
var RunnerTab = runnertabs.RunnerTab
var RunnerTabs = runnertabs.RunnerTabs

describe('RunnerTab', function(){
  var tab, runner, appview, results

  context('has no results', function(){
    beforeEach(function(){
      screen.$setSize(20, 8)
      runner = new Backbone.Model({
        name: 'Bob'
        , messages: new Backbone.Collection
      })
      runner.hasMessages = function(){ return false }
      appview = new Backbone.Model({currentTab: 0})
      appview.app = {config: {}}
      appview.isPopupVisible = function(){ return false }
      tab = new RunnerTab({
        runner: runner
        , appview: appview
        , selected: true
        , index: 0
        , screen: screen
      })
    })

    it('renders spinner', function(){
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
    it('renders checkmark if allPassed', function(){
      runner.set('allPassed', true)
      tab.render()
      expect(screen.buffer).to.be.deep.equal([
        '                    ',
        '                    ',
        '                    ',
        ' ━━━━━━━━━━━━━━┓    ',
        '       Bob     ┃    ',
        '       ✔       ┃    ',
        '               ┗    ',
        '                    ' ])
    })
    it('renders no border when deselected', function(){
      tab.set('selected', false)
      expect(screen.buffer).to.be.deep.equal([ 
        '                    ',
        '                    ',
        '                    ',
        '                    ',
        '       Bob          ',
        '        ◝           ',
        ' ━━━━━━━━━━━━━━━    ',
        '                    ' ])
    })
    /*it('doesnt overwrite the screen boundary', function(){
      tab.set('index', 1)

    })*/
  })

  context('has results', function(){
    beforeEach(function(){
      screen.$setSize(20, 8)
      results = new Backbone.Model()
      runner = new Backbone.Model({
        name: 'Bob'
        , messages: new Backbone.Collection
        , results: results
      })
      runner.hasMessages = function(){ return false }
      appview = new Backbone.Model({currentTab: 0})
      appview.app = {config: {}}
      appview.isPopupVisible = function(){ return false }
      tab = new RunnerTab({
        runner: runner
        , appview: appview
        , selected: true
        , index: 0
        , screen: screen
      })
    })
    it('renders test results', function(done){
      results.set('passed', 1)
      results.set('total', 1)
      process.nextTick(function(){
        expect(screen.buffer).to.be.deep.equal([
          '                    ',
          '                    ',
          '                    ',
          ' ━━━━━━━━━━━━━━┓    ',
          '       Bob     ┃    ',
          '     1/1 ◞     ┃    ',
          '               ┗    ',
          '                    ' ])
        done()
      })
    })
    it('renders check mark if all passed', function(){
      results.set({
        passed: 1
        , total: 1
        , all: true
      })
      expect(screen.buffer).to.be.deep.equal([ 
        '                    ',
        '                    ',
        '                    ',
        ' ━━━━━━━━━━━━━━┓    ',
        '       Bob     ┃    ',
        '     1/1 ✔     ┃    ',
        '               ┗    ',
        '                    ' ])
    })

  })
})


describe('RunnerTabs', function(){

  it('initializes', function(){
    screen.$setSize(20, 8)
    var runner = new Backbone.Model({
      name: 'Bob'
      , messages: new Backbone.Collection
    })
    runner.hasMessages = function(){ return false }
    var appview = new Backbone.Model({currentTab: 0, cols: 20})
    appview.app = {config: {}}
    appview.isPopupVisible = function(){ return false }
    appview.runners = function(){ return new Backbone.Collection }
    var tab = new RunnerTab({
      runner: runner
      , appview: appview
      , selected: true
      , index: 0
      , screen: screen
    })
    appview.isPopupVisible = function(){ return false }
    var tabs = new RunnerTabs([tab], {
      appview: appview,
      screen: screen
    })
    tabs.reRenderAll()
    tabs.eraseLast()
  })
})
