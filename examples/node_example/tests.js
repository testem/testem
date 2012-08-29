var assert = require('assert')

function hello(){
    return 'hello world';
}

describe('hello', function(){

    it('returns "hello world"', function(){
        assert.equal(hello(), 'hello world');
    });

});