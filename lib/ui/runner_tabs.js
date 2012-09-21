var SplitLogPanel = require('./split_log_panel')
var View = require('./view')
var Backbone = require('backbone')
var pad = require('../strutils').pad
var log = require('winston')
var Chars = require('../chars')
var assert = require('assert')

// Implementation of the tabbed UI. Each tab contains its own log panel.
// When the tab is not selected, it hides the associated log panel.

var TabWidth = exports.TabWidth = 15     // column width of each tab
var TabStartLine = exports.TabStartLine = 4  // row from the top to start drawing tabs
var TabHeight = exports.TabHeight = 4     // the height in rows of each tab
var TabStartCol = exports.TabStartCol = 1   // col from the left to start drawing tabs
var LogPanelUnusedLines = exports.LogPanelUnusedLines = 8  // number of rows in the UI does not belong to the log panel
var RunnerTab = exports.RunnerTab = View.extend({
    col: TabStartCol
    , line: TabStartLine
    , height: TabHeight
    , width: TabWidth
    , initialize: function(){
        var runner = this.get('runner')
          , results = runner.get('results')
          , index = this.get('index')
          , appview = this.get('appview')
          , self = this

        var visible = appview.get('currentTab') === index
        this.splitPanel = new SplitLogPanel({
            runner: runner
            , appview: appview
            , visible: visible
        })
        
        this.spinnerIdx = 0
        
        this.observe(appview, {
            'change:currentTab': function(){
                self.set('selected', appview.get('currentTab') === self.get('index'))
            }
        })
        this.observe(runner, {
            'change:name': function(){
                self.renderRunnerName()
            }
            , 'tests-start': function(){
                self.set('allPassed', true)
                self.splitPanel.resetScrollPositions()
                self.startSpinner()
            }
            , 'tests-end': function(){
                self.stopSpinner()
                self.renderResults()
            }
            , 'change:allPassed': function(model, value){
                self.set('allPassed', value)
            }
        })

        if (results){
            this.observe(results, {
                'change': function(){
                    var results = runner.get('results')
                    if (!results){
                        self.set('allPassed', true)
                    }else{
                        var passed = results.get('passed')
                        var total = results.get('total')
                        var allPassed = passed === total
                        var hasError = runner.get('messages').filter(function(m){
                            return m.get('type') === 'error'
                        }).length > 0
                        self.set('allPassed', allPassed && !hasError)
                    }
                }
                , 'change:all': function(){
                    self.renderResults()
                }
            })
        }

        this.observe(appview, 'change:isPopupVisible', function(appview, popupVisible){
            self.updateSplitPanelVisibility()
        })
        
        this.observe(this, {
            'change:selected': function(){
                self.updateSplitPanelVisibility()
            }
            , 'change:index change:selected': function(){
                self.render()
            }
            , 'change:allPassed': function(){
                self.renderRunnerName()
                self.renderResults()
            }
        })
        this.set({
            runner: runner
            , index: index
            , selected: false
            , allPassed: true
        })
    }
    , updateSplitPanelVisibility: function(){
        var appview = this.get('appview')
        this.splitPanel.set('visible', this.get('selected') && !appview.isPopupVisible())
    }
    , color: function(){
        return this.get('allPassed') ? 'green' : 'red'
    }
    , startSpinner: function(){
        this.stopSpinner()
        var self = this
        function render(){
            self.renderResults()
            self.setTimeoutID = setTimeout(render, 150)
        }
        render()
    }
    , stopSpinner: function(){
        if (this.setTimeoutID){
            clearTimeout(this.setTimeoutID)
        }
    }
    , isPopupVisible: function isPopupVisible(){
        var appview = this.get('appview')
        return appview && appview.isPopupVisible()
    }
    , render: function(){
        if (this.isPopupVisible()) return
        this.renderTab()
        this.renderRunnerName()
        this.renderResults()
    }
    , renderRunnerName: function(){
        if (this.isPopupVisible()) return
        var charm = this.charm
          , index = this.get('index')
          , line = this.line
          , width = this.width
          , col = this.col + index * width
          , runner = this.get('runner')
          , runnerName = runner.get('name')
        // write line 1
        charm
            .foreground(this.color())

        if (this.get('selected'))
            charm.display('bright')

        var runnerDisplayName = pad(runnerName || '', width - 2, ' ', 2)
        charm
            .position(col + 1, line + 1)
            .write(runnerDisplayName)
            .display('reset')
    }
    , renderResults: function(){
        if (this.isPopupVisible()) return
        var charm = this.charm
          , index = this.get('index')
          , line = this.line
          , width = this.width
          , col = this.col + index * width
          , runner = this.get('runner')
          , results = runner.get('results')
          , resultsDisplay = results ? results.get('passed') + '/' + results.get('total') : ''

        if (results && results.get('all')){
            resultsDisplay += ' ' + (this.get('allPassed') ? Chars.success : Chars.fail)
        }else if (!results && runner.get('allPassed') !== undefined){
            resultsDisplay = runner.get('allPassed') ? Chars.success : Chars.fail
        }else{
            resultsDisplay += ' ' + Chars.spinner[this.spinnerIdx++]
            if (this.spinnerIdx >= Chars.spinner.length) this.spinnerIdx = 0
        }

        resultsDisplay = pad(resultsDisplay, width - 4, ' ', 2)
        // write line 1
        charm
            .foreground(this.color())

        if (this.get('selected'))
            charm.display('bright')

        charm
            .position(col + 1, line + 2)
            .write(resultsDisplay)
            .display('reset')
    }
    , renderTab: function(){
        if (this.isPopupVisible()) return
        if (this.get('selected'))
            this.renderSelected()
        else
            this.renderUnselected()
    }
    , renderUnselected: function(){
        if (this.isPopupVisible()) return
        var charm = this.charm
          , index = this.get('index')
          , width = this.width
          , height = this.height
          , line = this.line
          , col = this.col + index * width
          , firstCol = index === 0
        charm.position(col, line)

        charm.write(Array(width + 1).join(' '))
        for (var i = 1; i < height - 1; i++){
            if (!firstCol){
                charm.position(col, line + i)
                charm.write(' ')
            }
            charm.position(col + width - 1, line + i)
            charm.write(' ')
        }

        var bottomLine = Array(width + 1).join(Chars.horizontal)
        charm.position(col, line + height - 1)
        charm.write(bottomLine)
    }
    , renderSelected: function(){
        if (this.isPopupVisible()) return
        var charm = this.charm
          , index = this.get('index')
          , width = this.width
          , height = this.height
          , line = this.line
          , col = this.col + index * width
          , firstCol = index === 0
        charm.position(col, line)

        charm.write((firstCol ? Chars.horizontal : Chars.topLeft) +
            Array(width - 1).join(Chars.horizontal) + 
                Chars.topRight)
        for (var i = 1; i < height - 1; i++){
            if (!firstCol){
                charm.position(col, line + i)
                charm.write(Chars.vertical)
            }
            charm.position(col + width - 1, line + i)
            charm.write(Chars.vertical)
        }

        var bottomLine = (firstCol ? ' ' : Chars.bottomRight) +
            Array(width - 1).join(' ') + Chars.bottomLeft
        charm.position(col, line + height - 1)
        charm.write(bottomLine)
    }
    , destroy: function(){
        this.stopSpinner()
        this.splitPanel.destroy()
        View.prototype.destroy.call(this)
    }
})

// View container for all the tabs. It'll handle clean up of removed tabs and draw
// the edge for where there are no tabs.
var RunnerTabs = exports.RunnerTabs = Backbone.Collection.extend({
    charm: View.prototype.charm
    , initialize: function(arr, attrs){
        this.appview = attrs.appview
        var self = this
        this.appview.runners().on('remove', function(removed, runners, options){
            var idx = options.index
            var tab = self.at(idx)
            assert.strictEqual(tab.get('runner'), removed)
            self.remove(tab)
        })
        this.on('remove', function(removed, tabs, options){
            var currentTab = self.appview.get('currentTab')
            if (currentTab >= self.length){
                currentTab--
                self.appview.set('currentTab', currentTab, {silent: true})
            }
            self.forEach(function(runner, idx){
                runner.set({
                    index: idx
                    , selected: idx === currentTab
                })
            })
            self.eraseLast()
            removed.destroy()
            if (self.length === 0) self.blankOutBackground()
        })
        this.appview.on('change:lines change:cols', function(){
            self.blankOutBackground()
            self.render()
        })
    }
    , blankOutBackground: function(){
        if (this.isPopupVisible()) return
        var charm = this.charm
          , cols = this.appview.get('cols')
        for (var i = 0; i < TabHeight; i++){
            charm
                .position(0, TabStartLine + i)
                .write(pad('', cols, ' ', 1))
        }
    }
    , render: function(){
        if (this.isPopupVisible()) return
        this.invoke('render')
        if (this.length > 0)
            this.renderLine()
    }
    , renderLine: function(){
        if (this.isPopupVisible()) return
        var startCol = this.length * TabWidth
        var lineLength = this.appview.get('cols') - startCol + 1
        if (lineLength > 0){
            this.charm
                .position(startCol + 1, TabStartLine + TabHeight - 1)
                .write(Array(lineLength).join(Chars.horizontal))
        }
    }
    , eraseLast: function(){
        if (this.isPopupVisible()) return
        var charm = this.charm
          , index = this.length
          , width = TabWidth
          , height = TabHeight
          , line = TabStartLine
          , col = TabStartCol + index * width

        for (var i = 0; i < height - 1; i++){
            charm
                .position(col, line + i)
                .write(Array(width + 1).join(' '))
        }

        var bottomLine = Array(width + 1).join(Chars.horizontal)
        charm.position(col, line + height - 1)
        charm.write(bottomLine)
    }
    , isPopupVisible: function isPopupVisible(){
        var appview = this.appview
        return appview && appview.isPopupVisible()
    }

})