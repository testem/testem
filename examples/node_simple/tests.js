var hello = require('./hello')
var expect = require('chai').expect

describe('hello', function(){
	it('should say hello', function(done){
		expect(hello()).to.equal('hello world')
        //setTimeout(done, 1000)
        console.error('hello there?')
        done()
	})

    it('should also be awesome', function(done){
        console.error('yeah, and then what?')
        //setTimeout(done, 1000)
        done()
    })

    it('should change reality', function(done){
        console.error('What? 1 isnt 2?')
        expect(1).to.equal(2)
        //setTimeout(done, 1000)
        done()
    })
})