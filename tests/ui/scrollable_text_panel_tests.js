var expect = require('chai').expect
var sandbox = require('sandboxed-module')
var spy = require('sinon').spy
var libDir = '../../lib/'
var screen = require('./fake_screen')
var ScrollableTextPanel = sandbox.require(libDir + 'ui/scrollable_text_panel', {
    requires: {
        './screen': screen
    }
})

describe('ScrollableTextPanel', function(){
    var panel
    before(function(){
        screen._setSize(10, 10)
        panel = new ScrollableTextPanel({
            line: 0
            , col: 0
            , width: 10
            , height: 10
        })
    })
    it('renders stuff', function(){
        panel.set('text', 'hello') // triggers render
        expect(panel.get('textLines')).to.deep.equal(['hello'])
        expect(screen.buffer[1]).to.equal('hello     ')
    })
})