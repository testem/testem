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

// String padding function from <http://jsfromhell.com/string/pad>
function pad(str, l, s, t){
    return (s || (s = " "), (l -= str.length) > 0 ? (s = new Array(Math.ceil(l / s.length)
        + 1).join(s)).substr(0, t = !t ? l : t == 1 ? 0 : Math.ceil(l / 2))
        + str + s.substr(0, l - t) : str).toString()
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

var ScrollableTextPanel = exports.ScrollableTextPanel = View.extend({
    defaults: {
        text: ''
        , textLines: []
        , scrollOffset: 0
    }
    // expect the attributes to have
    // -----------------------------
    //
    // * line and col (top left coordinates)
    // * height and width
    //
    // Optionally
    // ----------
    //
    // * textLines - array of text to draw in the panel
    // * scrollOffset
    , initialize: function(attrs){
        var self = this
        this.updateTextLines()
        this.observe(this, 'change:text change:width', function(model, text){
            self.updateTextLines()
        })
        this.observe(this, 'change:textLines change:height', function(){
            self.render()
        })
        this.render()
    }
    , updateTextLines: function(){
        this.set('textLines', this.splitLines(this.get('text'), this.get('width')))
    }
    , splitLines: function(text, colLimit){
        var firstSplit = this.get('text').split('\n')
        var secondSplit = []
        firstSplit.forEach(function(line){
            while (line.length > colLimit){
                var first = line.substring(0, colLimit)
                secondSplit.push(first)
                line = line.substring(colLimit)
            }
            if (line.length > 0) secondSplit.push(line)
        })
        log.info('ended up with lines')
        log.info(JSON.stringify(secondSplit.map(function(l){return l.toString()}), null, '  '))
        return secondSplit
    }
    , scrollUp: function(){
        var charm = this.charm
          , line = this.get('line')
          , height = this.get('height')
          , scrollOffset = this.get('scrollOffset')
        charm.enableScroll(line, lines + height)
        if (scrollOffset > 0){
            vertScrollOffset--
            this.set('scrollOffset', scrollOffset, {silent: true})
            if (process.platform === 'win32'){
                this.render()
            }else{
                charm.position(this.appview.get('cols') - 1, line)
                charm.scrollUp()
                this.render('first')
            }
        }
    }
    , scrollDown: function(){

    }
    , wrapText: function(lines){
        var idx = 0
          , cols = this.get('width')
        while(idx < lines.length){
            var line = lines[idx]
            if (line.length > cols){
                // break the line
                lines[idx] = line.substring(0, cols)
                lines.splice(idx + 1, 0, line.substring(cols))
            }
            idx++
        }
        return lines
    }
    , render: function(firstOrLast){
        log.info('render')
        var charm = this.charm
          , startLine = this.get('line')
          , col = this.get('col')
          , width = this.get('width')
          , height = this.get('height')
          , textLines = this.get('textLines')
          , scrollOffset = this.get('scrollOffset')

        log.info('width: ' + width)
        getTermSize(function(cols, lines){
            log.info('termsize: ' + cols + ', ' + lines)
        })

        function renderLine(i){
            var idx = i + scrollOffset
            var textLine = textLines[idx] || ''
            var output = textLine.toString()
            charm
                .position(col, startLine + i + 1)
                .write(output)
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

// A scrollable log panel - the panel where the error output is presented.
var LogPanel = exports.LogPanel = View.extend({
    defaults: {
        visible: false
        , topTextLines: []
        , topVertScrollOffset: 0
        , bottomTextLines: []
        , bottomVertScrollOffset: 0
    }
    , initialize: function(attrs){
        var line = attrs.line
          , col = attrs.col
          , browser = attrs.browser
          , appview = attrs.appview
        this.browser = browser
        this.appview = appview
        this.set({
            line: line
            , col: col
        })
        var self = this
          , results = browser.get('results')
          , logOutputChunks = browser.get('logOutputChunks')

        self.on('change:lines change:cols change:visible change:topTextLines change:bottomTextLines', function(){
            self.render()
        })

        if (logOutputChunks){
            this.observe(logOutputChunks, 'add remove', function(){
                self.updateBottomTextLines()
            })
        }
    
        if (results){
            var tests = results.get('tests')
            this.observe(results, 'change', function(){
                self.updateTopTextLines()
            })

            this.observe(tests, 'change add remove', function(){
                self.updateTopTextLines()
            })
        }
        
        this.observe(appview, 'change:lines change:cols', function(){
            self.updateDimensions()
            self.updateTopTextLines()
            self.updateBottomTextLines()
            self.render()
        })
        self.updateDimensions()
    }
    , updateDimensions: function(){
        var lines = this.appview.get('lines')
          , cols = this.appview.get('cols')
        this.set({
            height: lines - LogPanelUnusedLines
            , width: cols
        })
    }
    , scrollUp: function(){
        var vertScrollOffset = this.get('topVertScrollOffset')
        if (vertScrollOffset > 0){
            vertScrollOffset--
            this.set('topVertScrollOffset', vertScrollOffset, {silent: true})
            if (process.platform === 'win32'){
                this.render()
            }else{
                charm.position(this.appview.get('cols') - 1, LogPanelUnusedLines)
                charm.scrollUp()
                this.scrollDirection = 1
                this.render('first')
            }
        }
    }
    , scrollDown: function(){
        var vertScrollOffset = this.get('topVertScrollOffset')
        if (vertScrollOffset + this.get('height') < this.get('topTextLines').length - 1){
            vertScrollOffset++
            this.set('topVertScrollOffset', vertScrollOffset, {silent: true})
            if (process.platform === 'win32'){
                this.render()
            }else{
                charm.position(this.appview.get('cols') - 1, this.appview.get('lines') - 1)
                charm.scrollDown()
                this.scrollDirection = -1
                this.render('last')
            }
        }
    }
    , wrapText: function(lines){
        var idx = 0
          , cols = this.appview.get('cols')
        while(idx < lines.length){
            var line = lines[idx]
            if (line.length > cols){
                // break the line
                lines[idx] = line.substring(0, cols)
                lines.splice(idx + 1, 0, line.substring(cols))
            }
            idx++
        }
        return lines
    }
    , updateTopTextLines: function(){
        this.set('topTextLines', this.wrapText(this.getTestResultsText()))
    }
    , updateBottomTextLines: function(){
        this.set('bottomTextLines', this.wrapText(this.getLogMessagesText()))
    }
    , getTestResultsText: function(){
        var idx = this.appview.get('currentTab')
        var browser = this.browser
          , results = browser.get('results')
          , topLevelError = results ? results.get('topLevelError') : null
          , tests = null
          , out = ''


        if (topLevelError){
            out += "Top Level:\n" + indent(topLevelError) + '\n\n'
        }

        if (results && (tests = results.get('tests'))){
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
                results.get('all') ? Chars.success + ' ' + results.get('total') + ' tests complete.' : 'Looking good...'
            )
        }
        return out.split('\n').map(function(line){
            return StyledString(line)
        })
    }
    , getLogMessagesText: function(){
        var browser = this.browser
        var chunks = browser.get('logOutputChunks')
        return chunks.map(function(chunk){
            var type = chunk.get('type')
            var text = chunk.get('text')
            var color = type === 'error' ? 'red' : 'yellow'
            return StyledString(text, {foreground: color})
        })
    }
    , hasLogMessages: function(){
        return this.browser.get('logOutputChunks').length > 0
    }
    , hasResults: function(){
        return this.browser.hasResults()
    }
    , renderTextLines: function(startLine, height, textLines, vertScrollOffset, firstOrLast){
        var charm = this.charm
          , col = this.get('col')
          , width = this.get('width')
          , browser = this.browser

        //log.info(lines.join('\n'))

        function renderLine(i){    
            var textLine = textLines[i + vertScrollOffset] || ''
            //log.info('textLine: ' + textLine)
            charm.foreground('cyan')
            charm
                .position(col, startLine + i)
                .write(pad(textLine, width, ' ', 1))
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
    , render: function(){
        try{
            if (!this.get('visible')) return
            log.info('LogPanel:render')
            var charm = this.charm
              , line = this.get('line')
              , height = this.get('height')
              , width = this.get('width')
              , browser = this.get('browser')

            log.info('hasResults' + this.hasResults())
            log.info('height: ' + (this.hasResults() && this.hasLogMessages() ? height / 2 - 1 : height))
            this.renderTextLines(
                line
                , this.hasResults() && this.hasLogMessages() ? height / 2 - 1 : height
                , this.get('topTextLines')
                , this.get('topVertScrollOffset'))

            if (this.hasResults() && this.hasLogMessages()){
                // draw the dividing line
                charm
                    .position(0, line + height / 2 - 1)
                    .write(Array(width + 1).join(Chars.dot))
                    .display('reset')
            }
        
            this.renderTextLines(
                this.hasResults() ? line + height / 2 : line
                , this.hasResults() ? height / 2: height
                , this.get('bottomTextLines')
                , this.get('bottomVertScrollOffset'))
        }catch(e){
            log.error(e.message)
            log.error(e.stack)
        }
        
    }
})

// Implementation of the tabbed UI. Each tab contains its own log panel.
// When the tab is not selected, it hides the associated log panel.

var TabWidth = 15     // column width of each tab
  , TabStartLine = 4  // row from the top to start drawing tabs
  , TabHeight = 4     // the height in rows of each tab
  , TabStartCol = 1   // col from the left to start drawing tabs
  , LogPanelUnusedLines = 8  // number of rows in the UI does not belong to the log panel
var BrowserTab = exports.BrowserTab = View.extend({
    col: TabStartCol
    , line: TabStartLine
    , height: TabHeight
    , width: TabWidth
    , initialize: function(attrs){
        var browser = attrs.browser
          , index = attrs.index
          , appview = attrs.appview
        
        this.browser = browser

        try{
            this.logPanel = new LogPanel({
                line: LogPanelUnusedLines
                , col: 1
                , browser: browser
                , appview: appview
            })
            
            
            this.spinnerIdx = 0
            var self = this
              , results = browser.get('results')

            
            this.observe(appview, {
                'change:currentTab': function(){
                    self.set('selected', appview.get('currentTab') === self.get('index'))
                }
            })
            this.observe(browser, {
                'change:name': function(){
                    self.renderBrowserName()
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
                        var results = self.browser.get('results')
                        if (!results){
                            self.set('allPassed', true)
                        }else{
                            var passed = results.get('passed')
                              , total = results.get('total')
                              , allPassed = passed === total
                              , topLevelError = results.get('topLevelError')
                            self.set('allPassed', allPassed && !topLevelError)
                        }
                    }
                })
            }
            
            this.observe(this, {
                'change:selected': function(){
                    self.logPanel.set('visible', self.get('selected'))
                }
                , 'change:index change:selected': function(){
                    self.render()
                }
                , 'change:allPassed': function(){
                    self.renderBrowserName()
                    self.renderResults()
                }
            })
        }catch(e){
            log.info('Error: ' + e.message)
            log.info(e.stack)
        }
        this.set({
            browser: browser
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
        if (this.setTimeoutID) clearTimeout(this.setTimeoutID)
    }
    , render: function(){
        this.renderTab()
        this.renderBrowserName()
        this.renderResults()
    }
    , renderBrowserName: function(){
        var charm = this.charm
          , index = this.get('index')
          , line = this.line
          , width = this.width
          , col = this.col + index * width
          , browser = this.get('browser')
          , browserName = browser.get('name')
        // write line 1
        charm
            .foreground(this.color())

        if (this.get('selected'))
            charm.display('bright')

        charm
            .position(col + 1, line + 1)
            .write(pad(browserName || '', width - 2, ' ', 2))
            .display('reset')
    }
    , renderResults: function(){
        var charm = this.charm
          , index = this.get('index')
          , line = this.line
          , width = this.width
          , col = this.col + index * width
          , browser = this.get('browser')
          , results = browser.get('results')
          , resultsDisplay = results ? results.get('passed') + '/' + results.get('total') : ''

        if (results && results.get('all')){
            resultsDisplay += ' ' + (this.get('allPassed') ? Chars.success : Chars.fail)
        }else if (!results && browser.get('allPassed') !== undefined){
            resultsDisplay = browser.get('allPassed') ? Chars.success : Chars.fail
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
        this.logPanel.destroy()
        View.prototype.destroy.call(this)
    }
})

// View container for all the tabs. It'll handle clean up of removed tabs and draw
// the edge for where there are no tabs.
var BrowserTabs = exports.BrowserTabs = Backbone.Collection.extend({
    charm: charm
    , initialize: function(arr, attrs){
        this.appview = attrs.appview
        var self = this
        this.appview.browsers().on('remove', function(removed, browsers, options){
            var idx = options.index
            var tab = self.at(idx)
            assert.strictEqual(tab.get('browser'), removed)
            self.remove(tab)
        })
        this.on('remove', function(removed, tabs, options){
            var currentTab = self.appview.get('currentTab')
            if (currentTab >= self.length){
                currentTab--
                self.appview.set('currentTab', currentTab, {silent: true})
            }
            self.forEach(function(browser, idx){
                browser.set({
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
        , atLeastOneBrowser: false
    }
    , initialize: function(attrs){
        var app = attrs.app
        this.name = 'Testem'
        this.app = app
        this.initCharm()
        var browserTabs = this.browserTabs = new BrowserTabs([], {appview: this})
        this.set({
            browserTabs: browserTabs
        })
        var self = this
        var browsers = this.browsers()
        browsers.on('add', function(browser, options){
            var idx = options.index || browsers.length - 1
            var tab = new BrowserTab({
                browser: browser
                , index: idx
                , appview: self
            })
            browserTabs.push(tab)
        })
        browsers.on('add remove', function(){
            self.set('atLeastOneBrowser', browsers.length > 0)
        })
        browserTabs.on('add', function(){
            browserTabs.render()
        })
        this.on('change:atLeastOneBrowser', function(){
            if (self.get('atLeastOneBrowser')) self.set('currentTab', 0)
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
        this.renderMiddle()
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
            .write(pad('Open the URL below in a browser to connect.', cols, ' ', 1))
            .position(0, 3)
            .display('underscore')
            .write(url, cols, ' ', 1)
            .display('reset')
            .position(url.length + 1, 3)
            .write(pad('', cols - url.length, ' ', 1))

    }
    , renderMiddle: function(){
        if (this.browsers.length > 0) return
        var lines = this.get('lines')
          , cols = this.get('cols')
          , textLineIdx = Math.floor(lines / 2 + 2)
        for (var i = LogPanelUnusedLines; i < lines; i++){
            var text = (i === textLineIdx ? 'Waiting for browsers...' : '')
            charm
                .position(0, i)
                .write(pad(text, cols, ' ', 2))
        }
    }
    , renderBottom: function(){
        var charm = this.charm
          , cols = this.get('cols')
          , msg = (
            !this.get('atLeastOneBrowser') ? 
            '[q to quit]' :
            '[Press ENTER to run tests; q to quit]'
            )
        charm
            .position(0, this.get('lines'))
            .write(pad(msg, cols - 1, ' ', 1))
    }
    , browsers: function(){
        return this.app.runners
    }
    , currentBrowserTab: function(){
        var idx = this.get('currentTab')
        return this.browserTabs.at(idx)
    }
    , onInputChar: function(buf){
        try{
            var chr = String(buf).charAt(0)
              , i = chr.charCodeAt(0)
              , key = (buf[0] === 27 && buf[1] === 91) ? buf[2] : null
            if (buf[0] === 27 && buf[1] === 98)
                this.scrollLeft()
            else if (buf[0] === 27 && buf[1] === 102)
                this.scrollRight()
            else if (key === 67) // right arrow
                this.nextTab()
            else if (key === 68) // left arrow
                this.prevTab()
            else if (key === 66) // down arrow
                this.currentBrowserTab().logPanel.scrollDown()
            else if (key === 65) // up arrow
                this.currentBrowserTab().logPanel.scrollUp()
            this.trigger('inputChar', chr, i)
        }catch(e){
            log.error('In onInputChar: ' + e + '\n' + e.stack)
        }
    }
    , nextTab: function(){
        var currentTab = this.get('currentTab')
        currentTab++
        if (currentTab >= this.browsers().length)
            currentTab = 0
        this.set('currentTab', currentTab)
    }
    , prevTab: function(){
        var currentTab = this.get('currentTab')
        currentTab--
        if (currentTab < 0)
            currentTab = this.browsers().length - 1
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
