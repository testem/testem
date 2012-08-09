if (typeof require !== 'undefined'){
    var hello = require('./hello')
    var expect = require('chai').expect
}else{
    var expect = chai.expect
}


describe('hello', function(){

    it('should say hello', function(done){
        expect(hello()).to.equal('hello world')
        //console.log(hello())
        console.error(hello() + ' to you')
        setTimeout(done, 500)
    })

    it('should also be awesome', function(done){
        //setTimeout(done, 1000)
        //expect('blah').to.equal('blahueo')
        
        done()
    })

    it('should not change reality', function(done){
        
        //console.error('hello again')
        //expect(1).to.equal(2)
        //setTimeout(done, 1000)
        done()
    })
    it('should error', function(){
        throw new Error('blah')
    })
    it('should blah', function(){
        throw new Error('blah balh ueouo')
        
    })
    it('should blah again', function(){})
})