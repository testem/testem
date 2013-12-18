var tty = require('tty')
var appview = require('../lib/appview')
var ScrollableTextPanel = appview.ScrollableTextPanel
var StyledString = require('../lib/styled_string')
var View = appview.View
var getTermSize = require('../lib/gettermsize')
var log = require('npmlog')

var setRawMode = process.stdin.setRawMode ? 
    function(bool){ process.stdin.setRawMode(bool) } :
    tty.setRawMode

var AppView = View.extend({
    defaults: {
        currentTab: -1
        , atLeastOneBrowser: false
    }
    , initialize: function(attrs){
        this.initCharm()
        var size = process.stdout.getWindowSize()
        var text = StyledString('hello world\n', {foreground: 'red'}).concat(
            StyledString('abcdefghijklmnopqrstuvwxyz1234567890')
            , StyledString('ABCDEFGHIJKLMNOPQRSTUVWXYZ', {
                background: 'red'
                , foreground: 'white'
            }))
        for (var i = 0; i < 10; i++){
            text = text.concat(
                StyledString('\n' + i)
                , StyledString('abc', {
                    background: 'red'
                    , foreground: 'white'
                })
            )
        }
        this.textPanel = new ScrollableTextPanel({
            line: 0
            , col: 0
            , width: size[0]
            , height: size[1] - 5
            , text: text
            , appview: this
        })
        this.textPanel2 = new ScrollableTextPanel({
            line: size[1] - 5
            , col: 0
            , width: size[0]
            , height: 5
            , text: text
            , appview: this
        })
        var self = this
        setInterval(function(){
            getTermSize(function(cols, lines){
                self.textPanel.set({
                    width: cols
                    , height: lines - 5
                })
            })
        }, 500)
    }
    , initCharm: function(){
        var charm = this.charm
        charm.reset()
        charm.erase('screen')
        //charm.cursor(false)
        charm.on('data', this.onInputChar.bind(this))
        charm.on('^C', function(buf){
            this.cleanup(function(){
                process.exit()
            })
        }.bind(this))
    }
    , onInputChar: function(buf){
        try{
            var chr = String(buf).charAt(0)
              , i = chr.charCodeAt(0)
              , key = (buf[0] === 27 && buf[1] === 91) ? buf[2] : null
            if (key === 67) // right arrow
                this.textPanel2.scrollUp()
            else if (key === 68) // left arrow
                this.textPanel2.scrollDown()
            else if (key === 66) // down arrow
                this.textPanel.scrollDown()
            else if (key === 65) // up arrow
                this.textPanel.scrollUp()
            this.trigger('inputChar', chr, i)
        }catch(e){
            log.error('In onInputChar: ' + e + '\n' + e.stack)
        }
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
log.remove(log.transports.Console)
log.add(log.transports.File, {filename: 'scrollabletextpanel.log'})

log.info('blah')
new AppView