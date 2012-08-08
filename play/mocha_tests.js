var expect = require('chai').expect

function hello(){
    return 'hello world'
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
        expect(hello()).to.equal('hello world eue')
        console.error(hello() + ' to you')
        setTimeout(done, 500)
    })

    it('should also be awesome', function(done){
        //setTimeout(done, 1000)
        expect('blah').to.equal('blahueo')
        console.log('hello')
        done()
    })

    it('should not change reality', function(done){
        
        console.error('hello again')
        expect(1).to.equal(2)
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