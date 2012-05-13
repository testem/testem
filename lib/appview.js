require('./patchcharm.js')
var charm = require('charm')(process)
  , spawn = require('child_process').spawn
  , tty = require('tty')
  , log = require('winston')
  , getTermSize = require('./gettermsize.js')
  , EventEmitter = require('events').EventEmitter

var Chars = {
    horizontal: '\u2501',
    vertical: '\u2503',
    topLeft: '\u250f',
    topRight: '\u2513',
    bottomLeft: '\u251b',
    bottomRight: '\u2517',
    fail: '\u2718',
    success: '\u2714'
}

if (process.platform === 'win32'){
    // Windows doesn't support the cool box drawing characters
    Chars = {
        horizontal: '-',
        vertical: '|',
        topLeft: '+',
        topRight: '+',
        bottomLeft: '+',
        bottomRight: '+',
        fail: ' ',
        success: ' '
    }
}

function AppView(app){
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
AppView.prototype = {
    __proto__: EventEmitter.prototype,
    init: function(){
        charm.reset()
        charm.erase('screen')
        charm.on('data', this.onInputChar.bind(this))
        charm.on('^C', function(buf){
            this.cleanup(function(){
                process.exit()
            })
        }.bind(this))
        this.emit('init')
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
    },
    failedBrowsers: function(){
        return this.browsers().filter(function(b){
            return b.results && b.results.failed > 0
        })
    },
    browsers: function(){
        return this.app.server.browsers
    },
    currentTab: function(){
        return this._currentTab
    },
    colWidth: function(){
        return 15
    },
    pad: function(str, l, s, t){
        return s || (s = " "), (l -= str.length) > 0 ? (s = new Array(Math.ceil(l / s.length)
            + 1).join(s)).substr(0, t = !t ? l : t == 1 ? 0 : Math.ceil(l / 2))
            + str + s.substr(0, l - t) : str;
    },
    onInputChar: function(buf){
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
    },
    nextTab: function(){
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
    },
    prevTab: function(){
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
    },
    scrollLeft: function(){
        if (this.hScrollOffset > 0)
            this.hScrollOffset--
        this.renderLogPanel()
    },
    scrollRight: function(){
        this.hScrollOffset++
        this.renderLogPanel()
    },
    logPanelUnusedLines: 8,
    logPanelVisibleLines: function(){
        return this.lines - this.logPanelUnusedLines
    },
    renderTitle: function(){
        this.writeLine(0, "TEST\u0027EM \u0027SCRIPTS!")
    },
    renderTopInstructions: function(){
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
    },
    blankOutLine: function(line){
        charm.position(0, line)
        charm.write(Array(this.cols + 1).join(' '))
    },
    reset: function(){
        charm.display('reset')
    },
    renderTabs: function(){
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

            charm.position(startCol, 5)
            var color = this.colorForTab(browser)
            if (color) charm.foreground(color)
            if (selected) charm.display('bright')

            // write browser name
            var str = this.pad(browser.name || '', this.colWidth(), ' ', 2)
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
            charm.position(this.colWidth() * idx + 1, 6)
            charm.write(this.pad(str, this.colWidth(), ' ', 2))


            this.reset()

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
        }, this)
        
        this.stashCursor()
    },
    colorForTab: function(browser){
        return browser && browser.results ? 
            (browser.results.failed ? 'red' : 'green') : null
    },
    bottomInstructions: function(){
        if (this.app.server.browsers.length === 0)
            return '[q to quit]'
        else
            return '[Press ENTER to run tests; q to quit]'
    },
    stashCursor: function(){
        charm.position(this.cols, this.lines)
    },
    renderBottomInstructions: function(){
        charm.position(0, this.lines)
        charm.write(this.bottomInstructions())
    },
    writeLine: function(row, str, col, win){
        var out = this.pad(str, this.cols, ' ', 1).substring(0, this.cols)
        if (!win)
            win = this.win
        if (col === undefined)
            col = 0
        charm
            .position(col, row + 1)
            .write(out)
    },
    print: function(str, ln, col, win){
        str.split('\n').forEach(function(line){
            this.writeLine(ln++, line, col, win)
        }.bind(this))
    },
    indent: function(text){
        return text.split('\n').map(function(line){
            return '    ' + line
        }).join('\n')
    },
    renderLogPanel: function(firstOrLast){
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
                        return 'x ' + (item.message || 'failed') + 
                            (extra ? '\n' + this.indent(extra) : '')
                    }.bind(this)).join('\n'))
            }.bind(this)).join('\n') || 'All tests passed!'
            this.setLogText(out, firstOrLast)
        }
        this.stashCursor()
    },
    setLogText: function(text, firstOrLast){
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
    },
    scrollDown: function(){
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
    },
    scrollUp: function(){
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
    },
    renderAll: function(){
        this.renderTitle()
        this.renderTopInstructions()
        this.renderTabs()
        this.renderLogPanel()
        this.renderBottomInstructions()
    },
    refresh: function(){
        setTimeout(function(){
            this.stashCursor()
        }.bind(this), 1)
    },
    currentBrowser: function(){
        return this.browsers()[this.currentTab()]
    },
    selectFirstErrorTab: function(){
        var browsers = this.browsers()
        for (var i = 0, len = browsers.length; i < len; i++){
            var browser = browsers[i]
            if (browser.results && browser.results.failed > 0){
                this._currentTab = i
                return
            }
        }
    },
    onStartTests: function(){
    },
    viewProp: function(browser, prop, value){
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
    },
    onBrowsersChanged: function(){
        this.renderTabs()
        this.renderBottomInstructions()
        this.refresh()
        this.initBrowserViews()
    },
    initBrowserViews: function(){
        this.browsers().forEach(function(browser){
            if (!this.viewProp(browser, 'viewInitialized')){
                this.viewProp(browser, 'viewInitialized', true)
                this.viewProp(browser, 'running', true)
                this.viewProp(browser, 'spinnerIdx', 0)
            }
        }, this)
    },
    onTestResult: function(){
        this.renderTabs()
        this.refresh()
        this.renderLogPanel()
    },
    onAllTestResults: function(){
        var browser = this.currentBrowser()
        if (!browser || 
            (browser && browser.results && browser.results.failed === 0))
            this.selectFirstErrorTab()
        this.renderTabs()
        this.refresh()
        this.renderLogPanel()
    },
    cleanup: function(cb){
        charm.display('reset')
        charm.erase('screen')
        charm.position(0, 0)
        charm.enableScroll()
        tty.setRawMode(false)
        charm.destroy()
        if (cb) cb()
    }
}


module.exports = AppView