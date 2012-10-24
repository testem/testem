var libDir = '../../lib/'
var sandbox = require('sandboxed-module')
var screen = require('./fake_screen')
var ScrollableTextPanel = sandbox.require(libDir + 'ui/scrollable_text_panel', {
    requires: {
        './screen': screen
    }
})
var ErrorMessagesPanel = sandbox.require(libDir + 'ui/error_messages_panel', {
    requires: {
        './screen': screen
        , './scrollable_text_panel': ScrollableTextPanel
    }
})

describe('ErrorMessagesPanel', function(){
    var panel
    beforeEach(function(){
        panel = new ErrorMessagesPanel({
            line: 0
            , col: 0
            , width: 10
            , height: 10
            , text: 'blah'
        })
    })
    it('initializes', function(){})

})