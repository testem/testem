var expect = require('chai').expect
var spy = require('sinon').spy
var screen = require('./fake_screen')

describe('FakeScreen', function(){
    beforeEach(function(){
        screen._setSize(10, 10)
    })
    it('has initially', function(){
        expect(screen.buffer).to.deep.equal(
            [ '          ',
            '          ',
            '          ',
            '          ',
            '          ',
            '          ',
            '          ',
            '          ',
            '          ',
            '          ' ])
    })
    it('does stuff', function(){
        screen.position(0, 0)
        screen.write('hello')
        expect(screen.buffer[0]).to.equal('hello     ')
        screen.position(5, 0)
        screen.write('world')
        expect(screen.buffer[0]).to.equal('helloworld')
    })
    it('moves cursor when write', function(){
        screen.position(0, 0)
        screen.write('hello').write('world')
        expect(screen.buffer[0]).to.equal('helloworld')
    })
    it('does colors but has no effect', function(){
        screen.foreground('red')
        screen.background('black')
        screen.position(3, 0)
        screen.write('hello')
        screen.display('reset')
        expect(screen.buffer[0]).to.equal('   hello  ')
    })
    it('ignores characters that go over the end', function(){
        screen.position(0, 0)
        screen.write('hello world!')
        expect(screen.buffer[0]).to.equal('hello worl')
    })
    it('erases to end', function(){
        screen.position(0, 0)
        screen.write('helloworld')
        screen.position(5, 0)
        screen.erase('end')
        expect(screen.buffer[0]).to.equal('hello     ')
    })
})