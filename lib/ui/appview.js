/*

appview.js
==========

The actual AppView. This encapsulates the entire UI.

*/

var View = require('./view')
var tabs = require('./runner_tabs')
var RunnerTab = tabs.RunnerTab
var RunnerTabs = tabs.RunnerTabs
var getTermSize = require('../gettermsize')
var pad = require('../strutils').pad
var log = require('winston')
var ErrorMessagesPanel = require('./error_messages_panel')
var setRawMode = process.stdin.setRawMode ? 
    function(bool){ process.stdin.setRawMode(bool) } :
    tty.setRawMode


var AppView = module.exports = View.extend({
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

        this.errorMessagesPanel = new ErrorMessagesPanel({
            appview: this
            , text: ''
        })
        this.errorMessagesPanel.on('change:text', function(m, text){
            self.set('isPopupVisible', !!text)
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
        var charm = this.charm
        ;(function checkTermSize(){
            getTermSize(function(cols, lines){
                if (cols !== self.get('cols') || lines !== self.get('lines')){
                    charm.enableScroll(tabs.LogPanelUnusedLines, lines - 1)
                    self.set({
                        cols: cols
                        , lines: lines
                    })
                    self.updateErrorMessagesPanelSize()
                }
                setTimeout(checkTermSize, 500)
            }.catchem())
        }())
    }
    , updateErrorMessagesPanelSize: function(){
        this.errorMessagesPanel.set({
            line: 2
            , col: 4
            , width: this.get('cols') - 8
            , height: this.get('lines') - 4
        })
    }
    , render: function(){
        this.renderTop()
        if (!this.get('atLeastOneRunner')){
            this.renderMiddle()
        }
        this.renderBottom()
    }
    , renderTop: function(){
        if (this.isPopupVisible()) return
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
        if (this.isPopupVisible()) return
        if (this.runners.length > 0) return
        var charm = this.charm
        var lines = this.get('lines')
        var cols = this.get('cols')
        var textLineIdx = Math.floor(lines / 2 + 2)
        for (var i = tabs.LogPanelUnusedLines; i < lines; i++){
            var text = (i === textLineIdx ? 'Waiting for runners...' : '')
            charm
                .position(0, i)
                .write(pad(text, cols, ' ', 2))
        }
    }
    , renderBottom: function(){
        if (this.isPopupVisible()) return
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
            var i = chr.charCodeAt(0)
            var key = (buf[0] === 27 && buf[1] === 91) ? buf[2] : null
            var currentRunnerTab = this.currentRunnerTab()
            var splitPanel = currentRunnerTab && currentRunnerTab.splitPanel

            //log.info([buf[0], buf[1], buf[2]].join(','))
            if (key === 67){ // right arrow
                this.nextTab()
            }else if (key === 68){ // left arrow
                this.prevTab()
            }else if (key === 66){ // down arrow
                splitPanel.scrollDown()
            }else if (key === 65){ // up arrow
                splitPanel.scrollUp()
            }else if (chr === '\t'){
                splitPanel.toggleFocus()
            }else if (chr === ' '){
                splitPanel.pageDown()
            }else if (chr === 'b'){
                splitPanel.pageUp()
            }else if (chr === 'u'){
                splitPanel.halfPageUp()
            }else if (chr === 'd'){
                splitPanel.halfPageDown()
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
    , setErrorPopupMessage: function(msg){
        this.errorMessagesPanel.set('text', msg)
    }
    , clearErrorPopupMessage: function(){
        this.errorMessagesPanel.set('text', '')
        this.render()
    }
    , isPopupVisible: function(){
        return !! this.get('isPopupVisible')
    }
    , cleanup: function(cb){
        var charm = this.charm
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
