var hello = require('./hello')

describe('hello', function(t){
    it('should return hello', function(){
        expect(hello()).toBe('hello world')
    })
})
