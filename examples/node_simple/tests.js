if (typeof require !== 'undefined'){
    var hello = require('./hello')
    var expect = require('chai').expect
}else{
    var expect = chai.expect
}


describe('hello', function(){

    /*beforeEach(function(){
        originalConsoleLog = console.log
        console.log = function(){}
    })

    afterEach(function(){
        console.log = originalConsoleLog
    })*/

	it('should say hello', function(done){
		expect(hello()).to.equal('hello world')
        console.error(hello() + ' to you')
        setTimeout(done, 500)
	})

    it('should also be awesome', function(done){
        //setTimeout(done, 1000)
        console.error('hello')
        done()
    })

    it('should not change reality', function(done){
        
        console.error('hello again')
        expect(1).to.equal(1)
        //setTimeout(done, 1000)
        done()
    })
    it('should error', function(){
        //throw new Error('blah')
    })
    it('should blah', function(){
        
    })
    it('should blah again', function(){})
})