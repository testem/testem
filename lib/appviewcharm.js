var charm = require('charm')(process)
  , spawn = require('child_process').spawn
  , tty = require('tty')
  , log = require('winston')
  , getTermSize = require('./gettermsize.js')

function AppView(app){
    this.app = app
    this._currentTab = -1
    this.cbs = {init: [], inputChar: []}
    this.scrollOffset = 0
    this.hScrollOffset = 0
    this.logTextLines = []
    this.init()
}
AppView.prototype = {
    init: function(){
        charm.reset()
        charm.erase('screen')
        charm.on('data', this.onInputChar.bind(this))
        charm.on('^C', function(buf){
            this.cleanup(function(){
                process.exit()
            })
        }.bind(this))
        this.notify('init')
        var checkTermSize = function(){
            getTermSize(function(cols, lines){
                if (cols !== this.cols || lines !== this.lines){
                    this.cols = cols
                    this.lines = lines
                    charm.enableScroll(6, this.lines - 1)
                    this.renderAll()
                }
                setTimeout(checkTermSize, 500)
            }.bind(this))
        }.bind(this)
        checkTermSize()
        this.startRunningIndicator()
    },
    notify: function(event, args){
        this.cbs[event].forEach(function(cb){
            cb.apply(null, args)
        })
    },
    failedBrowsers: function(){
        return this.browsers().filter(function(b){
            return b.results && b.results.failed > 0
        })
    },
    startRunningIndicator: function(){
        this.running = true
        var chars = '-\\|/'
          , idx = 0
        var tick = function(){
            if (!this.running){
                charm
                    .position(this.cols, 0)
                    .write(' ')
                return
            }
            charm
                .position(this.cols, 0)
                .write(chars[idx++])
            if (idx >= 4) idx = 0
            setTimeout(tick, 100)
        }.bind(this)
        tick()
    },
    stopRunningIndicator: function(){
        this.running = false
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
    on: function(event, cb){
        this.cbs[event].push(cb)
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
            this.notify('inputChar', [chr, i])
        }catch(e){
            log.error('In onInputChar: ' + e + '\n' + e.stack)
        }
    },
    nextTab: function(){
        log.info('nextTab')
        if (this.currentTab() >= 0){
            this._currentTab++
            if (this._currentTab >= this.browsers().length)
              this._currentTab = 0
        }else if (this.currentTab() === -1 && 
            this.browsers().length > 0)
            this._currentTab = 0
        this.renderBrowserHeaders()
        this.renderTestResults()
        this.scrollOffset = 0
        this.hScrollOffset = 0
        this.renderLogPanel()
    },
    prevTab: function(){
        log.info('prevTab')
        if (this.currentTab() >= 0){
            this._currentTab--
            if (this._currentTab < 0)
                this._currentTab = this.browsers().length - 1
        }else if (this.currentTab() === -1 && 
            this.browsers().length > 0)
            this._currentTab = 0
        this.renderBrowserHeaders()
        this.renderTestResults()
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
    logPanelUnusedLines: 6,
    logPanelVisibleLines: function(){
        return this.lines - this.logPanelUnusedLines
    },
    renderTitle: function(){
        this.writeLine(0, "TEST\u0027EM \u0027SCRIPTS!")
    },
    renderTopInstructions: function(){
        this.writeLine(1, 'Open the URL below in a browser to connect.')
        charm.display('underscore')
        var url = 'http://' + this.app.server.ipaddr + ':' + 
            this.app.server.config.port
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
    tabStyleOn: function(browser){
        charm
            .background(this.colorForTab(browser))
            .display('reverse')
    },
    renderBrowserHeaders: function(){
        this.blankOutLine(4)
        this.app.server.browsers.forEach(function(browser, idx){
            charm.position(this.colWidth() * idx + 1, 4)
            if (this.currentTab() === idx)
                this.tabStyleOn(browser)
            else
                charm.foreground(this.colorForTab(browser))
            var str = this.pad(browser.name || '', this.colWidth(), ' ', 2)
            charm.write(str)
            this.reset()
        }.bind(this))
    },
    renderTestResults: function(){
        this.blankOutLine(5)
        this.app.server.browsers.forEach(function(browser, idx){
            if (this.currentTab() === idx)
                this.tabStyleOn(browser)
            else
                charm.foreground(this.colorForTab(browser))
            var out
            if (browser.results)
                out = browser.results.passed + '/' + browser.results.total
            else
                out = 'N/A'
            charm.position(this.colWidth() * idx + 1, 5)
            charm.write(
                this.pad(out, this.colWidth(), ' ', 2))
            this.reset()
        }.bind(this))
    },
    colorForTab: function(browser){
        return browser && browser.results ? 
            (browser.results.failed ? 'red' : 'green') :
            'black'
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
        log.info('writing bottom row at ' + this.lines)
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
        var browser = this.app.server.browsers[this.currentTab()]
        this.tabStyleOn(browser)
        if (!browser || (!browser.results && !browser.topLevelError)){
            this.setLogText('Results not ready.', firstOrLast)
            return
        }
        if (browser.topLevelError){
            this.setLogText(browser.topLevelError, firstOrLast)
        }else if (browser.results && browser.results.items){
            var out = browser.results.items.map(function(item){
                return item.name + '\n    ' + 
                    (item.message || 'failed.') + '\n' +
                    (item.stackTrace ? this.indent(item.stackTrace) : '')
            }.bind(this)).join('\n') || 'All tests passed!'
            this.setLogText(out, firstOrLast)
        }
        this.stashCursor()
    },
    setLogText: function(text, firstOrLast){
        this.logText = text
        var lines = this.logTextLines = text.split('\n')
          , numOtherLines = 6
          , numVisibleLines = this.lines - numOtherLines
        var renderLine = function(i){
            var idx = this.scrollOffset + i
            var line = lines[idx] || ''
            if (this.hScrollOffset)
                line = line.substring(this.hScrollOffset * 4)
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
        if (this.scrollOffset + this.logPanelVisibleLines() < this.logTextLines.length - 1){
            this.scrollOffset++
            charm.position(this.cols - 1, this.lines - 1)
            charm.scrollDown()
            this.renderLogPanel('last')
        }
    },
    scrollUp: function(){
        if (this.scrollOffset > 0){
            this.scrollOffset--
            charm.position(this.cols - 1, 6)
            charm.scrollUp()
            this.renderLogPanel('first')
        }
    },
    renderAll: function(){
        this.renderTitle()
        this.renderTopInstructions()
        this.renderBrowserHeaders()
        this.renderTestResults()
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
    onAllTestResults: function(){
        var browser = this.currentBrowser()
        if (!browser || 
            (browser && browser.results && browser.results.failed === 0))
            this.selectFirstErrorTab()
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
    cleanup: function(cb){
        log.info('cleanup')
        charm.display('reset')
        charm.erase('screen')
        charm.position(0, 0)
        charm.enableScroll()
        tty.setRawMode(false)
        charm.destroy()
        log.info('destroyed')
        if (cb) cb()
    }
}

module.exports = AppView