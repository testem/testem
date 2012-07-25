var hello = require('./hello')
var expect = require('chai').expect

describe('hello', function(){
	it('should say hello', function(done){
		expect(hello()).to.equal('hello world')
        console.error(hello())
        setTimeout(done, 500)
	})

    it('should also be awesome', function(done){
        //setTimeout(done, 1000)
        console.error('hello')
        done()
    })

    it('should not change reality', function(done){
        
        console.error('hello again')
        expect(1).to.equal(2)
        //setTimeout(done, 1000)
        done()
    })
})