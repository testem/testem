/*

appview.js
==========

This is the view layer of the text-based UI(via Backbone).
We use charm for drawing to the terminal(I monkey-patched it to add 
text scrolling functionality - Substack didn't take my pull request :( )

*/

require('./patchcharm.js')
var charm = require('charm')(process)
  , spawn = require('child_process').spawn
  , tty = require('tty')
  , log = require('winston')
  , getTermSize = require('./gettermsize')
  , StyledString = require('./styled_string')
  , EventEmitter = require('events').EventEmitter
  , Backbone = require('backbone')
  , _ = require('underscore')
  , assert = require('assert')
  , splitLines = require('./splitlines')

var setRawMode = process.stdin.setRawMode ? 
    function(bool){ process.stdin.setRawMode(bool) } :
    tty.setRawMode

// Special characters to use for drawing. 
var Chars = {
    horizontal: '\u2501'
    , vertical: '\u2503'
    , topLeft: '\u250f'
    , topRight: '\u2513'
    , bottomLeft: '\u251b'
    , bottomRight: '\u2517'
    , fail: '\u2718'
    , success: '\u2714'
    , cross: '\u2718'
    , spinner: '\u25dc\u25dd\u25de\u25df'
    , dot: '\u00b7'
}

if (process.platform === 'win32'){
    // Windows (by default) doesn't support the cool unicode characters
    Chars = {
        horizontal: '-'
        , vertical: '|'
        , topLeft: '+'
        , topRight: '+'
        , bottomLeft: '+'
        , bottomRight: '+'
        , fail: 'x'
        , success: 'v'
        , cross: 'x'
        , spinner: '-\\|/'
        , dot: '.'
    }
}

exports.Chars = Chars

// allow charm.write() to take any object: just convert the passed in object to a string
charm.write = function(charm, write){
    return function(obj){
        if (!(obj instanceof Buffer) && typeof obj !== 'string'){
            obj = String(obj)
        }
        return write.call(charm, obj)
    }
}(charm, charm.write)

// A wrapper around charm (gives the same API) that automatically parks the cursor
// to the bottom right corner when not in use
charm = function(charm){
    var timeoutID
    function parkCursor(){
        getTermSize(function(cols, lines){
            charm.position(cols, lines)
        })
    }
    function wrapFunc(func){
        return function(){
            if (timeoutID) clearTimeout(timeoutID)
            var retval = func.apply(charm, arguments)
            timeoutID = setTimeout(parkCursor, 150)
            return retval
        }
    }
    var cursorParker = {}
    for (var prop in charm){
        var value = charm[prop]
        if (typeof value === 'function'){
            cursorParker[prop] = wrapFunc(value)
        }
    }
    return cursorParker
}(charm)

// String padding function adapted from <http://jsfromhell.com/string/pad>
function pad(str, l, s, t){
    var ol = l
    return (s || (s = " "), (l -= str.length) > 0 ? (s = new Array(Math.ceil(l / s.length)
        + 1).join(s)).substr(0, t = !t ? l : t == 1 ? 0 : Math.ceil(l / 2))
        + str + s.substr(0, l - t) : str).substring(0, ol)
}

function indent(text){
    return text.split('\n').map(function(line){
        return '    ' + line
    }).join('\n')
}

// ============== Backbone-based View Models ============================


// View is the base class for our view models. That's right, view-models.
// All of our views carry state of some sort.
var View = exports.View = Backbone.Model.extend({
    charm: charm
    , observe: function(model, thing){
        var eventMap
        if (typeof thing === 'string' && arguments.length === 3){
            eventMap = {}
            eventMap[thing] = arguments[2]
        }else{
            eventMap = thing
        }
        for (var event in eventMap){
            model.on(event, eventMap[event])
        }
        if (!this.observers)
            this.observers = []
        this.observers.push([model, eventMap])
    }
    , destroy: function(){
        this.removeObservers()
    }
    , removeObservers: function(){
        if (!this.observers) return
        this.observers.forEach(function(observer){
            var model = observer[0]
              , eventMap = observer[1]
            for (var event in eventMap){
                model.off(event, eventMap[event])
            }
        })
    }
})

// This is a generic scrollable text viewer widget. Should be refactored
// out to another file or npm module at some point.
var ScrollableTextPanel = exports.ScrollableTextPanel = View.extend({
    defaults: {
        visible: true
        , text: ''
        , textLines: []
        , scrollOffset: 0
    }
    // expect the attributes to have
    // -----------------------------
    //
    // * line and col (top left coordinates)
    // * height and width
    , initialize: function(attrs){
        var self = this
        this.updateTextLines()
        this.observe(this, 'change:text change:width', function(model, text){
            self.updateTextLines()
        })
        this.observe(this, 'change:visible change:textLines change:height', function(){
            self.render()
        })
        this.render()
    }
    , updateTextLines: function(){
        var text = this.get('text')
        var lines = splitLines(text, this.get('width'))
        this.set('textLines', lines)
    }
    , scrollUp: function(){
        var charm = this.charm
          , line = this.get('line')
          , height = this.get('height')
          , width = this.get('width')
          , scrollOffset = this.get('scrollOffset')
        if (scrollOffset > 0){
            charm.enableScroll(line + 1, line + height)
            scrollOffset--
            this.set('scrollOffset', scrollOffset, {silent: true})
            if (process.platform === 'win32'){
                this.render()
            }else{
                charm.position(0, line + 1)
                charm.scrollUp()
                this.render('first')
            }
        }
    }
    , scrollDown: function(){
        var charm = this.charm
          , line = this.get('line')
          , height = this.get('height')
          , width = this.get('width')
          , scrollOffset = this.get('scrollOffset')
          , textLines = this.get('textLines')
          , appview = this.get('appview')
        if (textLines.length > height + scrollOffset){
            charm.enableScroll(line + 1, line + height)
            scrollOffset++
            this.set('scrollOffset', scrollOffset, {silent: true})
            if (process.platform === 'win32'){
                this.render()
            }else{
                charm.position(0, line + height)
                charm.scrollDown()
                this.render('last')
            }
        }
    }
    , render: function(firstOrLast){
        if (!this.get('visible')) return

        var charm = this.charm
          , startLine = this.get('line')
          , col = this.get('col')
          , width = this.get('width')
          , height = this.get('height')
          , textLines = this.get('textLines')
          , text = this.get('text')
          , scrollOffset = this.get('scrollOffset')
        
        function renderLine(i){
            var idx = i + scrollOffset
            var textLine = textLines[idx] || ''
            var output = textLine.toString()

            charm
                .position(col, startLine + i + 1)
                .write(output)
            if (textLine.length < width)
                charm.erase('end')
        }
        
        if (!firstOrLast){
            for (var i = 0; i < height; i++){
                renderLine(i)
            }
        }else if (firstOrLast === 'first'){
            renderLine(0)
        }else if (firstOrLast === 'last'){
            renderLine(height - 1)
        }

        charm.display('reset')
    }
})


var SplitLogPanel = exports.SplitLogPanel = View.extend({
    defaults: {
        visible: false
        , focus: 'top'
    }
    , initialize: function(attrs){
        var runner = this.get('runner')
        var results = runner.get('results')
        var messages = runner.get('messages')
        var appview = this.get('appview')
        var visible = this.get('visible')
        var self = this
        var topPanel = this.topPanel = new ScrollableTextPanel({
            line: TabStartLine + TabHeight - 1
            , col: 0
            , visible: visible
        })
        var bottomPanel = this.bottomPanel = new ScrollableTextPanel({
            col: 0
            , visible: visible
        })
        this.observe(appview, 'change:cols change:lines', function(){
            self.syncDimensions()
            self.render()
        })
        if (results){
            this.observe(results, 'change', function(){
                self.syncResultsDisplay()
            })
        }
        this.observe(messages, 'reset add remove', function(){
            self.syncDimensions()
            self.syncMessages()
        })
        this.observe(this, 'change:visible', function(){
            var visible = self.get('visible')
            topPanel.set('visible', visible, {silent: true})
            bottomPanel.set('visible', visible, {silent: true})
            self.render()
        })
        this.syncDimensions({silent: true})
        this.syncResultsDisplay({silent: true})
        this.syncMessages({silent: true})
        this.render()
    }
    , toggleFocus: function(){
        var focus = this.get('focus')
        this.set('focus', focus === 'top' ? 'bottom' : 'top')
    }
    , scrollUp: function(){
        if (this.get('focus') === 'top'){
            this.topPanel.scrollUp()
        }else{
            this.bottomPanel.scrollUp()
        }
    }
    , scrollDown: function(){
        if (this.get('focus') === 'top'){
            this.topPanel.scrollDown()
        }else{
            this.bottomPanel.scrollDown()
        }
    }
    , syncMessages: function(options){
        this.bottomPanel.set('text', this.getMessagesText(), options)
    }
    , syncResultsDisplay: function(options){
        this.topPanel.set('text', this.getResultsDisplayText(), options)
    }
    , syncDimensions: function(options){
        var appview = this.get('appview')
        var termCols = appview.get('cols')
        var termLines = appview.get('lines')
        var runner = this.get('runner')
        if (runner.hasMessages() && runner.hasResults()){
            var midLine = Math.floor((termLines - LogPanelUnusedLines) / 2)
            this.topPanel.set({
                height: midLine
                , width: termCols
            }, options)
            var line = midLine + TabStartLine + TabHeight - 1
            var bottomPanelAttrs = {
                line: line
                , height: termLines - line - 1
                , width: termCols
            }
            this.bottomPanel.set(bottomPanelAttrs, options)
        }else if (runner.hasMessages()){ // only has messages
            this.topPanel.set({
                height: 0
                , width: termCols
            }, options)
            var height = termLines - LogPanelUnusedLines
            this.bottomPanel.set({
                line: TabStartLine + TabHeight - 1
                , height: height
                , width: termCols
            }, options)
        }else{ // only has results

            // Hide the bottom panel if there are no messages 
            // to be displayed
            var topPanelHeight = termLines - LogPanelUnusedLines
            this.topPanel.set({
                height: topPanelHeight
                , width: termCols
            }, options)
            this.bottomPanel.set({
                line: TabStartLine + TabHeight + topPanelHeight
                , height: 0
                , width: termCols
            }, options)
        }
    }
    , render: function(){
        this.topPanel.render()
        this.bottomPanel.render()
    }
    , getResultsDisplayText: function(){
        var appview = this.get('appview')
        var runner = this.get('runner')
        var idx = appview.get('currentTab')
        var results = runner.get('results')
        var topLevelError = results ? results.get('topLevelError') : null
        var tests = null
        var out = ''

        if (topLevelError){
            out += "Top Level:\n" + indent(topLevelError) + '\n\n'
        }

        if (results && (tests = results.get('tests'))){
            var total = results.get('total')
            var allDone = results.get('all')
            var failedTests = tests.filter(function(test){
                return test.get('failed') > 0
            })
            out += failedTests.map(function(test){
                var failedItems = test.get('items').filter(function(item){
                    return !item.passed
                })
                return test.get('name') + '\n' + 
                    indent(failedItems.map(function(item){
                        var extra = ''
                        var stacktrace = item.stacktrace
                        if (stacktrace){
                            var stacklines = stacktrace.split('\n')
                            if (stacklines[0] === item.message)
                                stacktrace = stacklines.slice(1).map(function(line){
                                    return line.trim()
                                }).join('\n')
                            extra = stacktrace
                        }else{
                            if (item.file)
                                extra += item.file
                            if (item.line)
                                extra += ' ' + item.line
                        }
                        return Chars.cross + ' ' + (item.message || 'failed') + 
                            (extra ? '\n' + indent(extra) : '')
                    }.bind(this)).join('\n'))
            }.bind(this)).join('\n') || (
                total > 0 ?
                    (allDone ? 
                        Chars.success + ' ' + total + ' tests complete.' : 
                        'Looking good...') :
                    (allDone ?
                        'No tests were run :(' :
                        'Please be patient :)')
            )
        }

        return StyledString(out, {foreground: 'cyan'})
    }
    , getMessagesText: function(){
        var messages = this.get('runner').get('messages')
        var retval = StyledString('')
        messages.forEach(function(message){
            var type = message.get('type')
            var text = message.get('text')
            var color = type === 'error' ? 'red' : 'yellow'
            retval = retval.concat(StyledString(text + '\n', {foreground: color}))
        })
        return retval
    }
})

// Implementation of the tabbed UI. Each tab contains its own log panel.
// When the tab is not selected, it hides the associated log panel.

var TabWidth = 15     // column width of each tab
  , TabStartLine = 4  // row from the top to start drawing tabs
  , TabHeight = 4     // the height in rows of each tab
  , TabStartCol = 1   // col from the left to start drawing tabs
  , LogPanelUnusedLines = 8  // number of rows in the UI does not belong to the log panel
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

        try{
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
            
            this.observe(this, {
                'change:selected': function(){
                    self.splitPanel.set('visible', self.get('selected'))
                }
                , 'change:index change:selected': function(){
                    self.render()
                }
                , 'change:allPassed': function(){
                    self.renderRunnerName()
                    self.renderResults()
                }
            })
        }catch(e){
            log.info('Error: ' + e.message)
            log.info(e.stack)
        }
        this.set({
            runner: runner
            , index: index
            , selected: false
            , allPassed: true
        })

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
    , render: function(){
        this.renderTab()
        this.renderRunnerName()
        this.renderResults()
    }
    , renderRunnerName: function(){
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

        log.info('runnerName: ' + runnerName)
        var runnerDisplayName = pad(runnerName || '', width - 2, ' ', 2)
        log.info('[' + runnerDisplayName + ']')
        charm
            .position(col + 1, line + 1)
            .write(runnerDisplayName)
            .display('reset')
    }
    , renderResults: function(){
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
        if (this.get('selected'))
            this.renderSelected()
        else
            this.renderUnselected()
    }
    , renderUnselected: function(){
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

        var bottomLine = (firstCol ? ' ' : Chars.bottomLeft) +
            Array(width - 1).join(' ') + Chars.bottomRight
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
    charm: charm
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
        var charm = this.charm
          , cols = this.appview.get('cols')
        for (var i = 0; i < TabHeight; i++){
            charm
                .position(0, TabStartLine + i)
                .write(pad('', cols, ' ', 1))
        }
    }
    , render: function(){
        this.invoke('render')
        if (this.length > 0)
            this.renderLine()
    }
    , renderLine: function(){
        var startCol = this.length * TabWidth
        var lineLength = this.appview.get('cols') - startCol + 1
        if (lineLength > 0){
            this.charm
                .position(startCol + 1, TabStartLine + TabHeight - 1)
                .write(Array(lineLength).join(Chars.horizontal))
        }
    }
    , eraseLast: function(){
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
})

// The actual AppView. This encapsulates the entire UI.
var AppView = exports.AppView = View.extend({
    defaults: {
        currentTab: -1
        , atLeastOneRunner: false
    }
    , initialize: function(attrs){
        var app = attrs.app
        this.name = 'Testem'
        this.app = app
        this.initCharm()
        var runnerTabs = this.runnerTabs = new RunnerTabs([], {appview: this})
        this.set({
            runnerTabs: runnerTabs
        })
        var self = this
        var runners = this.runners()
        runners.on('add', function(runner, options){
            var idx = options.index || runners.length - 1
            var tab = new RunnerTab({
                runner: runner
                , index: idx
                , appview: self
            })
            runnerTabs.push(tab)
        })
        runners.on('add remove', function(){
            self.set('atLeastOneRunner', runners.length > 0)
        })
        runnerTabs.on('add', function(){
            runnerTabs.render()
        })
        this.on('change:atLeastOneRunner', function(){
            if (self.get('atLeastOneRunner')) self.set('currentTab', 0)
            self.renderMiddle()
            self.renderBottom()
        })
        this.on('change:lines change:cols', function(){
            self.render()
        })
        this.startMonitorTermSize()
    }
    , initCharm: function(){
        var charm = this.charm
        charm.reset()
        charm.erase('screen')
        charm.cursor(false)
        charm.on('data', this.onInputChar.bind(this))
        charm.on('^C', function(buf){
            this.cleanup(function(){
                process.exit()
            })
        }.bind(this))
    }
    , startMonitorTermSize: function(){
        var self = this
        ;(function checkTermSize(){
            getTermSize(function(cols, lines){
                if (cols !== self.get('cols') || lines !== self.get('lines')){
                    charm.enableScroll(LogPanelUnusedLines, lines - 1)
                    self.set({
                        cols: cols
                        , lines: lines
                    })
                }
                setTimeout(checkTermSize, 500)
            })
        }())
    }
    , render: function(){
        this.renderTop()
        if (!this.get('atLeastOneRunner')){
            this.renderMiddle()
        }
        this.renderBottom()
    }
    , renderTop: function(){
        var charm = this.charm
          , url = 'http://localhost:' + this.app.config.get('port')
          , cols = this.get('cols')
        charm
            .position(0, 1)
            .write(pad('TEST\u0027EM \u0027SCRIPTS!', cols, ' ', 1))
            .position(0, 2)
            .write(pad('Open the URL below in a runner to connect.', cols, ' ', 1))
            .position(0, 3)
            .display('underscore')
            .write(url, cols, ' ', 1)
            .display('reset')
            .position(url.length + 1, 3)
            .write(pad('', cols - url.length, ' ', 1))

    }
    , renderMiddle: function(){
        if (this.runners.length > 0) return
        var lines = this.get('lines')
          , cols = this.get('cols')
          , textLineIdx = Math.floor(lines / 2 + 2)
        for (var i = LogPanelUnusedLines; i < lines; i++){
            var text = (i === textLineIdx ? 'Waiting for runners...' : '')
            charm
                .position(0, i)
                .write(pad(text, cols, ' ', 2))
        }
    }
    , renderBottom: function(){
        var charm = this.charm
          , cols = this.get('cols')
          , msg = (
            !this.get('atLeastOneRunner') ? 
            '[q to quit]' :
            '[Press ENTER to run tests; q to quit]'
            )
        charm
            .position(0, this.get('lines'))
            .write(pad(msg, cols - 1, ' ', 1))
    }
    , runners: function(){
        return this.app.runners
    }
    , currentRunnerTab: function(){
        var idx = this.get('currentTab')
        return this.runnerTabs.at(idx)
    }
    , onInputChar: function(buf){
        try{
            var chr = String(buf).charAt(0)
              , i = chr.charCodeAt(0)
              , key = (buf[0] === 27 && buf[1] === 91) ? buf[2] : null
            if (buf[0] === 27 && buf[1] === 98){
                this.scrollLeft()
            }else if (buf[0] === 27 && buf[1] === 102){
                this.scrollRight()
            }else if (key === 67){ // right arrow
                this.nextTab()
            }else if (key === 68){ // left arrow
                this.prevTab()
            }else if (key === 66){ // down arrow
                this.currentRunnerTab().splitPanel.scrollDown()
            }else if (key === 65){ // up arrow
                this.currentRunnerTab().splitPanel.scrollUp()
            }else if (chr === '\t'){
                this.currentRunnerTab().splitPanel.toggleFocus()
            }
            this.trigger('inputChar', chr, i)
        }catch(e){
            log.error('In onInputChar: ' + e + '\n' + e.stack)
        }
    }
    , nextTab: function(){
        var currentTab = this.get('currentTab')
        currentTab++
        if (currentTab >= this.runners().length)
            currentTab = 0
        this.set('currentTab', currentTab)
    }
    , prevTab: function(){
        var currentTab = this.get('currentTab')
        currentTab--
        if (currentTab < 0)
            currentTab = this.runners().length - 1
        this.set('currentTab', currentTab)
    }
    , cleanup: function(cb){
        charm.display('reset')
        charm.erase('screen')
        charm.position(0, 0)
        charm.enableScroll()
        charm.cursor(true)
        setRawMode(false)
        charm.destroy()
        if (cb) cb()
    }
})
