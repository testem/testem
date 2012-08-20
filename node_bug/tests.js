var assert = require('assert')

function hello(){
    return 'hello world'
}

describe('hello', function(){
    it('should say hello', function(){
        assert.equal(hello(), 'hello world')
    })
})
    
