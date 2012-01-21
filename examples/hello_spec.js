describe('hello', function(){
    it('should say hello', function(){
        expect(hello()).toBe('hello world')
    })
    it('should not say not hello', function(){
        expect(hello()).toNotBe('not hello world')
    })
    it('should throw exception', function(){
        //expect(!!navigator.userAgent.match(/Firefox/)).toBe(true)
        throw new Error('Crap')
    })
    it('should throw another exception', function(){
        waits(500)
        throw new Error('Blah')
    })
    it('should throw even more exceptions', function(){
        waits(500)
        throw new Error('Foobar')
    })
    it('should be firefox', function(){
        waits(500)
        expect(navigator.userAgent).toMatch(/Firefox/)
    })
    it('should do async', function(){
        waits(1000)
        
    })
})