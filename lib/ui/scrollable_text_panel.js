var View = require('./view')
var log = require('winston')
var splitLines = require('../strutils').splitLines

// This is a generic scrollable text viewer widget. Should be refactored
// out to another file or npm module at some point.
var ScrollableTextPanel = module.exports = View.extend({
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