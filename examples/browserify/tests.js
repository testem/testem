var hello = require('./hello')

describe('hello', function(t){
    it('should return hello', function(){
        expect(hello()).toBe('hello world')
    })

    it('should say hello to subject', function(){
        expect(hello('Bob')).toBe('hello Bob')
    })
})
