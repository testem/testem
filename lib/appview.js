require('./patchcharm.js')
var charm = require('charm')(process)
  , spawn = require('child_process').spawn
  , tty = require('tty')
  , log = require('winston')
  , getTermSize = require('./gettermsize.js')
  , EventEmitter = require('events').EventEmitter
  , Backbone = require('backbone')
  , _ = require('underscore')
  , assert = require('assert')

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
}

if (process.platform === 'win32'){
    // Windows doesn't support the cool box drawing characters
    Chars = {
        horizontal: '-'
        , vertical: '|'
        , topLeft: '+'
        , topRight: '+'
        , bottomLeft: '+'
        , bottomRight: '+'
        , fail: ' '
        , success: ' '
        , cross: 'x'
    }
}

exports.Chars = Chars

function pad(str, l, s, t){
    return s || (s = " "), (l -= str.length) > 0 ? (s = new Array(Math.ceil(l / s.length)
        + 1).join(s)).substr(0, t = !t ? l : t == 1 ? 0 : Math.ceil(l / 2))
        + str + s.substr(0, l - t) : str;
}

function indent(text){
    return text.split('\n').map(function(line){
        return '    ' + line
    }).join('\n')
}

var AppView = exports.AppView = Backbone.Model.extend({
    initialize: function AppView(app){
        this.app = app
        this._currentTab = -1
        this.scrollOffset = 0
        this.hScrollOffset = 0
        this.logTextLines = []
        this.spinnerChars = '-\\|/'
        this.browserViews = {}  // this holds view data for each browser, keyed
                                // by socket sessionId
        this.init()
    }
    , init: function(){
        charm.reset()
        charm.erase('screen')
        charm.on('data', this.onInputChar.bind(this))
        charm.on('^C', function(buf){
            this.cleanup(function(){
                process.exit()
            })
        }.bind(this))
        this.trigger('init')
        var self = this
        ;(function checkTermSize(){
            getTermSize(function(cols, lines){
                if (cols !== self.cols || lines !== self.lines){
                    log.info('Terminal size changed. Reset settings.')
                    self.cols = cols
                    self.lines = lines
                    charm.enableScroll(self.logPanelUnusedLines, self.lines - 1)
                    self.renderAll()
                }
                setTimeout(checkTermSize, 500)
            })
        }())
        setInterval(this.renderTabs.bind(this), 100)
    }
    , failedBrowsers: function(){
        return this.browsers().filter(function(b){
            return b.results && b.results.failed > 0
        })
    }
    , browsers: function(){
        return this.app.server.browsers
    }
    , currentTab: function(idx){
        if (idx === undefined)
            return this._currentTab
        else
            this._currentTab = idx
    }
    , colWidth: function(){
        return 15
    }
    , pad: pad
    , onInputChar: function(buf){
        //log.info('==buf')
        //for (var i = 0, len = buf.length; i < len; i++)
        //    log.info(buf[i])
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
                this.scrollDown()
            else if (key === 65) // up arrow
                this.scrollUp()
            this.emit('inputChar', chr, i)
        }catch(e){
            log.error('In onInputChar: ' + e + '\n' + e.stack)
        }
    }
    , nextTab: function(){
        if (this.currentTab() >= 0){
            this._currentTab++
            if (this._currentTab >= this.browsers().length)
              this._currentTab = 0
        }else if (this.currentTab() === -1 && 
            this.browsers().length > 0)
            this._currentTab = 0
        this.renderTabs()
        this.scrollOffset = 0
        this.hScrollOffset = 0
        this.renderLogPanel()
    }
    , prevTab: function(){
        if (this.currentTab() >= 0){
            this._currentTab--
            if (this._currentTab < 0)
                this._currentTab = this.browsers().length - 1
        }else if (this.currentTab() === -1 && 
            this.browsers().length > 0)
            this._currentTab = 0
        this.renderTabs()
        this.scrollOffset = 0
        this.hScrollOffset = 0
        this.renderLogPanel()
    }
    , scrollLeft: function(){
        if (this.hScrollOffset > 0)
            this.hScrollOffset--
        this.renderLogPanel()
    }
    , scrollRight: function(){
        this.hScrollOffset++
        this.renderLogPanel()
    }
    , logPanelUnusedLines: 8
    , logPanelVisibleLines: function(){
        return this.lines - this.logPanelUnusedLines
    }
    , renderTitle: function(){
        this.writeLine(0, "TEST\u0027EM \u0027SCRIPTS!")
    }
    , renderTopInstructions: function(){
        this.writeLine(1, 'Open the URL below in a browser to connect.')
        charm.display('underscore')
        var url = 'http://localhost:' + 
            this.app.config.get('port')
        charm
            .position(0, 3)
            .write(url)
            .display('reset')
            .write(Array(this.cols - url.length + 1).join(' '))
        this.reset()
    }
    , blankOutLine: function(line){
        charm.position(0, line)
        charm.write(Array(this.cols + 1).join(' '))
    }
    , reset: function(){
        charm.display('reset')
    }
    , renderTab: function(){

    }
    , renderTabs: function(){
        var browsers = this.browsers()
        this.blankOutLine(4)
        this.blankOutLine(5)
        this.blankOutLine(6)
        charm.position(1, 7)
        charm.write(Array(this.cols).join(Chars.horizontal))
        browsers.forEach(function(browser, idx){
            var colWidth = this.colWidth()
              , startCol = colWidth * idx + 1
              , selected = this.currentTab() === idx
              , firstCol = idx === 0


            if (selected){
                // draw the tab
                charm.position(startCol, 4)

                charm.write((firstCol ? Chars.horizontal : Chars.topLeft) +
                    Array(colWidth - 1).join(Chars.horizontal) + 
                        Chars.topRight)
                ;[5, 6].forEach(function(row){
                    if (!firstCol){
                        charm.position(startCol, row)
                        charm.write(Chars.vertical)
                    }
                    charm.position(startCol + colWidth - 1, row)
                    charm.write(Chars.vertical)
                })

                var bottomLine = (firstCol ? ' ' : Chars.bottomLeft) +
                    Array(colWidth - 1).join(' ') + Chars.bottomRight
                charm.position(startCol, 7)
                charm.write(bottomLine)
            }

            charm.position(startCol + 1, 5)
            var color = this.colorForTab(browser)
            if (color) charm.foreground(color)
            if (selected) charm.display('bright')

            // write browser name
            var str = this.pad(browser.name || '', this.colWidth() - 2, ' ', 2)
            charm.write(str)
            
            // write test results so far
            str
            if (browser.results)
                str = browser.results.passed + '/' + browser.results.total
            else
                str = 'N/A'
            if (!browser.results.all){
                var spinnerIdx = this.viewProp(browser, 'spinnerIdx')
                str = '  ' + str + ' ' + this.spinnerChars[spinnerIdx++]
                if (spinnerIdx >= this.spinnerChars.length){
                    spinnerIdx = 0
                }
                this.viewProp(browser, 'spinnerIdx', spinnerIdx)
            }else{
                str = '  ' + str + ' ' + (
                    browser.results.failed > 0 ? Chars.fail : Chars.success)
            }
            charm.position(this.colWidth() * idx + 2, 6)
            charm.write(this.pad(str, this.colWidth() - 2, ' ', 2))


            this.reset()

            
        }, this)
        
        this.stashCursor()
    }
    , colorForTab: function(browser){
        return browser && browser.results ? 
            (browser.results.failed ? 'red' : 'green') : null
    }
    , bottomInstructions: function(){
        if (this.app.server.browsers.length === 0)
            return '[q to quit]'
        else
            return '[Press ENTER to run tests; q to quit]'
    }
    , stashCursor: function(){
        charm.position(this.cols, this.lines)
    }
    , renderBottomInstructions: function(){
        charm.position(0, this.lines)
        charm.write(this.bottomInstructions())
    }
    , writeLine: function(row, str, col, win){
        var out = this.pad(str, this.cols, ' ', 1).substring(0, this.cols)
        if (!win)
            win = this.win
        if (col === undefined)
            col = 0
        charm
            .position(col, row + 1)
            .write(out)
    }
    , print: function(str, ln, col, win){
        str.split('\n').forEach(function(line){
            this.writeLine(ln++, line, col, win)
        }.bind(this))
    }
    , indent: indent
    , renderLogPanel: function(firstOrLast){
        var idx = this.currentTab()
        if (idx < 0){
            this.setLogText('No browser selected.', firstOrLast)
            return
        }
        var browser = this.app.server.browsers[idx]
          , results = browser ? browser.results : null
          , topLevelError = browser ? browser.topLevelError : null
        
        if (!results && !topLevelError){
            this.setLogText('Results not ready.', firstOrLast)
            return
        }
        if (topLevelError){
            this.setLogText(browser.topLevelError, firstOrLast)
        }else if (results && results.tests){
            var failedTests = results.tests.filter(function(test){
                return test.failed > 0
            })
            var out = failedTests.map(function(test){
                var failedItems = test.items.filter(function(item){
                    return !item.passed
                })
                return test.name + '\n' + 
                    this.indent(failedItems.map(function(item){
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
                            (extra ? '\n' + this.indent(extra) : '')
                    }.bind(this)).join('\n'))
            }.bind(this)).join('\n') || (
                results.all ? Chars.success + results.total + ' tests complete. ' : 'Looking good...'
            )
            this.setLogText(out, firstOrLast)
        }
        this.stashCursor()
    }
    , setLogText: function(text, firstOrLast){
        this.logText = text
        var lines = this.logTextLines = text.split('\n')
          , numOtherLines = this.logPanelUnusedLines
          , numVisibleLines = this.lines - numOtherLines
        var renderLine = function(i){
            var idx = this.scrollOffset + i
            var line = lines[idx] || ''
            if (this.hScrollOffset)
                line = line.substring(this.hScrollOffset * 32)
            this.writeLine(numOtherLines - 1 + i, line)
        }.bind(this)
        if (!firstOrLast)
            for (var i = 0; i < numVisibleLines; i++){
                renderLine(i)
            }
        else if (firstOrLast === 'first')
            renderLine(0)
        else if (firstOrLast === 'last') 
            renderLine(numVisibleLines - 1)
        this.reset()
    }
    , scrollDown: function(){
        if (this.scrollOffset + this.logPanelVisibleLines() < 
            this.logTextLines.length - 1){
            this.scrollOffset++
            if (process.platform === 'win32'){
                // windows no support scroll
                this.renderLogPanel()
            }else{
                charm.position(this.cols - 1, this.lines - 1)
                charm.scrollDown()
                this.renderLogPanel('last')
            }
        }
    }
    , scrollUp: function(){
        if (this.scrollOffset > 0){
            this.scrollOffset--
            if (process.platform === 'win32'){
                // windows no support scroll
                this.renderLogPanel()
            }else{
                charm.position(this.cols - 1, this.logPanelUnusedLines)
                charm.scrollUp()
                this.renderLogPanel('first')
            }
        }
    }
    , renderAll: function(){
        this.renderTitle()
        this.renderTopInstructions()
        this.renderTabs()
        this.renderLogPanel()
        this.renderBottomInstructions()
    }
    , refresh: function(){
        setTimeout(function(){
            this.stashCursor()
        }.bind(this), 1)
    }
    , currentBrowser: function(){
        return this.browsers()[this.currentTab()]
    }
    , selectFirstErrorTab: function(){
        var browsers = this.browsers()
        for (var i = 0, len = browsers.length; i < len; i++){
            var browser = browsers[i]
            if (browser.results && browser.results.failed > 0){
                this._currentTab = i
                return
            }
        }
    }
    , onStartTests: function(){
    }
    , viewProp: function(browser, prop, value){
        var key = browser.client.id
        var view = this.browserViews[key]
        if (value === undefined){
            // get
            if (!view) return null
            return view[prop]
        }else{
            // set
            view = this.browserViews[key]
            if (!view){
                view = this.browserViews[key] = {}
            }
            view[prop] = value
        }
    }
    , onBrowsersChanged: function(){
        if (this.currentTab() === -1 &&
            this.browsers().length > 0){
            this.currentTab(0)
        }
        this.renderTabs()
        this.renderBottomInstructions()
        this.refresh()
        this.initBrowserViews()
    }
    , initBrowserViews: function(){
        this.browsers().forEach(function(browser){
            if (!this.viewProp(browser, 'viewInitialized')){
                this.viewProp(browser, 'viewInitialized', true)
                this.viewProp(browser, 'running', true)
                this.viewProp(browser, 'spinnerIdx', 0)
            }
        }, this)
    }
    , onTestResult: function(){
        this.renderTabs()
        this.refresh()
        this.renderLogPanel()
    }
    , onAllTestResults: function(){
        this.renderTabs()
        this.refresh()
        this.renderLogPanel()
    }
    , cleanup: function(cb){
        charm.display('reset')
        charm.erase('screen')
        charm.position(0, 0)
        charm.enableScroll()
        tty.setRawMode(false)
        charm.destroy()
        if (cb) cb()
    }
})

var View = exports.View = Backbone.Model.extend({
    charm: charm
    , observe: function(model, eventMap){
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

var LogPanel = exports.LogPanel = View.extend({
    initialize: function(line, col, appview){
        this.appview = appview
        this.set({
            line: line
            , col: col
            , vertScrollOffset: 0
        })
        var self = this
        appview.on('change:currentTab', function(){
            self.removeObservers()
            var idx = appview.get('currentTab')
            if (idx < 0) return
            var browser = appview.browsers().at(idx)
              , results = browser.get('results')
              , tests = results.get('tests')
            self.observe(results, {
                'change': function(){
                    log.info('results changed')
                    self.render()
                }
            })
            self.observe(tests, {
                'change add remove': function(){
                    self.render()
                }
            })
            self.observe('browser')
        })
        appview.on('change:lines change:cols change:currentTab', function(){
            self.render()
        })

    }
    , getLogText: function(){
        var idx = this.appview.get('currentTab')
        var browser = this.appview.browsers().at(idx)
          , results = browser ? browser.get('results') : null
          , topLevelError = browser ? browser.get('topLevelError') : null
          , tests = null
        log.info('index: ' + idx)
        if (idx >= 0)
            log.info('browser: ' + browser.get('name'))
        if (!results && !topLevelError){
            return 'Waiting...'
        }
        if (topLevelError){
            return browser.topLevelError
        }else if (results && (tests = results.get('tests'))){
            var failedTests = tests.filter(function(test){
                return test.get('failed') > 0
            })
            log.info(JSON.stringify(failedTests[0], null, '  '))
            
            var out = failedTests.map(function(test){
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
            return out
        }
    }
    , render: function(){
        var charm = this.charm
          , line = this.get('line')
          , col = this.get('col')
          , text = this.getLogText()
          , lines = text.split('\n')
          , height = this.get('height')
          , width = this.get('width')
          , vertScrollOffset = this.get('vertScrollOffset')
        if (!height) return
        for (var i = 0; i < height; i++){
            var textLine = lines[i + vertScrollOffset]
            charm.position(col, line + i)
            charm.write(pad(textLine || '', width, ' ', 1))
        }
    }
})

var Spinner = exports.Spinner = View.extend({
    initialize: function(line, col){
        this.set({
            line: line
            , col: col
        })
        this.spinnerChars = '-\\|/'
        this.spinnerIdx = 0
    }
    , start: function(){
        this.set('running', true)
        this.trigger('start')
        var update = function(){
            this.render()
            this.timeoutID = setTimeout(update, 150)
        }.bind(this)
        update()
    }
    , stop: function(){
        log.info('stopped spinner')
        this.set('running', false)
        this.trigger('stop')
        clearTimeout(this.timeoutID)
    }
    , render: function(){
        var charm = this.charm
          , chr = this.spinnerChars[this.spinnerIdx++]
          , color = this.get('color')
        if (this.spinnerIdx >= this.spinnerChars.length){
            this.spinnerIdx = 0
        }
        if (color)
            charm.foreground(color)
        charm.position(this.get('col'), this.get('line'))
        charm.write(chr)
        if (color) charm.display('reset')
    }
})

var TabWidth = 15
  , TabStartLine = 4
  , TabHeight = 4
  , TabStartCol = 1
var BrowserTab = exports.BrowserTab = View.extend({
    col: TabStartCol
    , line: TabStartLine
    , height: TabHeight
    , width: TabWidth
    , initialize: function(browser, index, appview){
        this.browser = browser

        var tab = this
          , results = browser.get('results')

        tab.spinner = new Spinner(TabStartLine + 2, this.col + (index + 1) * this.width - 2)

        this.observe(appview, {
            'change:currentTab': function(){
                tab.set('selected', appview.get('currentTab') === tab.get('index'))
            }
        })
        this.observe(browser, {
            'change:name': function(){
                tab.renderBrowserName()
            }
            , 'tests-start': function(){
                tab.spinner.start()
            }
        })
        this.observe(results, {
            'change': function(){
                tab.renderBrowserName()
                tab.renderResults()

                var results = tab.browser.get('results')
                tab.set('allPassed', results.get('passed') === results.get('total'))
            }
            , 'change:all': function(){
                tab.spinner.stop()
                tab.renderCheckOrX()
            }
        })
        this.observe(this, {
            'change:index change:selected': function(){
                tab.render()
            }
            , 'change:allPassed': function(){
                tab.renderBrowserName()
                tab.renderResults()
                tab.spinner.set('color', tab.color())
            }
        })

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
    , renderCheckOrX: function(){
        var spinner = this.spinner
          , charm = this.charm
        charm
            .foreground(this.color())
            .position(spinner.get('col'), spinner.get('line'))
            .write(this.get('allPassed') ? Chars.success : Chars.fail)
            .display('reset')
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
          , resultsDisplay = results.get('passed') + '/' + results.get('total')


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
})

var BrowserTabs = exports.BrowserTabs = Backbone.Collection.extend({
    charm: charm
    , initialize: function(tabs, options){
        this.appview = options.appview
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
            //self.renderLine()
            removed.destroy()
        })
    }
    , render: function(){
        this.invoke('render')
        this.renderLine()
    }
    , renderLine: function(){
        var startCol = this.length * TabWidth
        this.charm
            .position(startCol + 1, TabStartLine + TabHeight - 1)
            .write(Array(this.appview.get('cols') - startCol + 1).join(Chars.horizontal))
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

var AppView = exports.AppView = View.extend({
    initialize: function(app){
        this.name = 'Testem'
        this.app = app
        this.initCharm()
        var browserTabs = this.browserTabs = new BrowserTabs([], {appview: this})
        this.logPanel = new LogPanel(8, 1, this)
        this.set({
            currentTab: -1
            , browserTabs: browserTabs
            , atLeastOneBrowser: false
        })
        var self = this
        var browsers = this.browsers()
        browsers.on('add', function(browser, options){
            var idx = options.index || browsers.length - 1
            browserTabs.push(new BrowserTab(browser, idx, self))
        })
        browsers.on('add remove', function(){
            self.set('atLeastOneBrowser', browsers.length > 0)
        })
        browserTabs.on('add', function(){
            browserTabs.render()
        })
        this.on('change:atLeastOneBrowser', function(){
            if (self.get('atLeastOneBrowser')) self.set('currentTab', 0)
            self.renderBottom()
        })
        this.on('change:lines change:cols', function(){
            var lines = self.get('lines')
              , cols = self.get('cols')
            self.logPanel.set({
                height: lines - 8
                , width: cols
            })
            self.render()
        })
        this.startMonitorTermSize()
    }
    , initCharm: function(){
        var charm = this.charm
        charm.reset()
        charm.erase('screen')
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
                    charm.enableScroll(self.logPanelUnusedLines, lines - 1)
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
        this.renderBottom()
    }
    , renderTop: function(){
        var charm = this.charm
          , url = 'http://localhost:' + this.app.config.get('port')
        charm
            .position(0, 1)
            .write('TEST\u0027EM \u0027SCRIPTS!')
            .position(0, 2)
            .write('Open the URL below in a browser to connect.')
            .position(0, 3)
            .display('underscore')
            .write(url)
            .display('reset')

    }
    , renderBottom: function(){
        var charm = this.charm
          , msg = (
            !this.get('atLeastOneBrowser') ? 
            '[q to quit]                          ' :
            '[Press ENTER to run tests; q to quit]'
            )
        charm
            .position(0, this.get('lines'))
            .write(msg)
    }
    , browsers: function(){
        return this.app.server.browsers
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
                this.scrollDown()
            else if (key === 65) // up arrow
                this.scrollUp()
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
        tty.setRawMode(false)
        charm.destroy()
        if (cb) cb()
    }
})
